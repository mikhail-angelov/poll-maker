import express, { type Request, type Response } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sessionMiddleware } from './session';
import { parseQuestionFormat, serializeQuestionFormat } from '../shared/questionFormat';
import { validatePollInput, validateAnswers } from '../shared/validation';
import { errorCodes } from '../shared/errorCodes';
import type { PollQuestion, AnswerMap } from '../shared/types';
import { answers as answersTable, polls as pollsTable } from './db/schema';
import type { Db } from './db/client';
import { toCsv } from './csv';

export function createApp(db: Db) {
  const app = express();

  app.set('trust proxy', 1);

  // Middleware
  app.use(express.json());
  app.use(sessionMiddleware);

  // Helper function to send error responses
  function sendError(res: Response, status: number, errors: string[]) {
    res.status(status).json({ errors });
  }

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  // Helper to require admin poll
  async function requireAdminPoll(req: Request, res: Response) {
    const adminHash = req.headers['x-poll-admin-hash'] as string;
    if (!adminHash) {
      sendError(res, 401, [errorCodes.ADMIN_HASH_REQUIRED]);
      return null;
    }

    const [poll] = await db.db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.adminHash, adminHash))
      .limit(1);

    if (!poll) {
      sendError(res, 403, [errorCodes.ADMIN_HASH_INVALID]);
      return null;
    }

    return poll;
  }

  // GET /api/session
  app.get('/api/session', (req: Request, res: Response) => {
    res.json({ userId: req.userId });
  });

  // GET /api/user/polls
  app.get('/api/user/polls', async (req: Request, res: Response) => {
    try {
      const userPolls = await db.db
        .select({
          adminHash: pollsTable.adminHash,
          pollId: pollsTable.pollId,
          name: pollsTable.name,
          active: pollsTable.active,
          createdAt: pollsTable.createdAt,
        })
        .from(pollsTable)
        .where(eq(pollsTable.userId, req.userId))
        .orderBy(desc(pollsTable.createdAt));

      res.json({ polls: userPolls });
    } catch (error) {
      console.error('Error fetching user polls:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // POST /api/polls
  app.post('/api/polls', async (req: Request, res: Response) => {
    try {
      const { name, details, questions: questionText } = req.body;
      
      if (typeof questionText !== 'string') {
        return sendError(res, 400, ['QUESTION_FORMAT_INVALID']);
      }
      
      // Parse question text
      let questions: PollQuestion[];
      try {
        questions = parseQuestionFormat(questionText);
      } catch (error) {
        return sendError(res, 400, [errorMessage(error, 'QUESTION_FORMAT_INVALID')]);
      }

      // Validate poll input
      const validation = validatePollInput({ name, details, questions });
      if (!validation.ok) {
        return sendError(res, 400, validation.errors);
      }

      // Generate IDs
      const id = crypto.randomUUID();
      const pollId = nanoid(20);
      const adminHash = nanoid(20);
      const now = new Date().toISOString();

      await db.db.insert(pollsTable).values({
        id,
        userId: req.userId,
        pollId,
        adminHash,
        name: name.trim(),
        details: details.trim(),
        questions: JSON.stringify(questions),
        active: true,
        createdAt: now,
        updatedAt: now
      });

      // Return response
      res.status(201).json({
        pollId,
        adminHash,
        publicUrl: `/poll/${pollId}`,
        adminUrl: `/admin/${adminHash}`
      });
    } catch (error) {
      console.error('Error creating poll:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // GET /api/polls/:pollId
  app.get('/api/polls/:pollId', async (req: Request, res: Response) => {
    try {
      const pollId = req.params.pollId as string;
      
      const [result] = await db.db
        .select({
          id: pollsTable.id,
          pollId: pollsTable.pollId,
          name: pollsTable.name,
          details: pollsTable.details,
          questions: pollsTable.questions,
          active: pollsTable.active
        })
        .from(pollsTable)
        .where(eq(pollsTable.pollId, pollId))
        .limit(1);
      
      if (!result) {
        return sendError(res, 404, [errorCodes.POLL_NOT_FOUND]);
      }

      // Parse questions from JSON string
      const questions = JSON.parse(result.questions);

      // Return public poll data (without adminHash and userId)
      res.json({
        id: result.id,
        pollId: result.pollId,
        name: result.name,
        details: result.details,
        questions,
        active: result.active
      });
    } catch (error) {
      console.error('Error fetching poll:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // GET /api/admin/poll
  app.get('/api/admin/poll', async (req: Request, res: Response) => {
    try {
      const poll = await requireAdminPoll(req, res);
      if (!poll) return;

      // Get submitted answers count
      const [answersResult] = await db.db
        .select({ count: count() })
        .from(answersTable)
        .where(and(eq(answersTable.pollId, poll.pollId), eq(answersTable.status, 'submitted')));

      const submittedCount = answersResult?.count || 0;
      const questions = JSON.parse(poll.questions);

      const recentAnswers = await db.db
        .select({
          time: answersTable.time,
          userInfo: answersTable.userInfo,
          answers: answersTable.answers,
          status: answersTable.status
        })
        .from(answersTable)
        .where(and(eq(answersTable.pollId, poll.pollId), eq(answersTable.status, 'submitted')))
        .orderBy(desc(answersTable.createdAt))
        .limit(50);

      const results = recentAnswers.map((row: any) => {
        const answers = JSON.parse(row.answers);
        const answeredCount = Object.values(answers).filter((a: any) => 
          (a.selectedOptions && a.selectedOptions.length > 0) || (a.text && a.text.trim())
        ).length;

        return {
          time: row.time,
          user_info: row.userInfo,
          answered_questions: answeredCount,
          answers: JSON.stringify(answers)
        };
      });

      res.json({
        poll: {
          id: poll.id,
          pollId: poll.pollId,
          name: poll.name,
          details: poll.details,
          questions,
          active: poll.active
        },
        summary: {
          questionCount: questions.length,
          submittedCount
        },
        results
      });
    } catch (error) {
      console.error('Error fetching admin poll:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // PUT /api/admin/poll
  app.put('/api/admin/poll', async (req: Request, res: Response) => {
    try {
      const poll = await requireAdminPoll(req, res);
      if (!poll) return;

      const { name, details, questions: questionText, active } = req.body;
      const now = new Date().toISOString();

      let questions: PollQuestion[] = JSON.parse(poll.questions);
      let updatedQuestions = poll.questions;

      if (typeof questionText === 'string') {
        try {
          questions = parseQuestionFormat(questionText);
          updatedQuestions = JSON.stringify(questions);
        } catch (error) {
          return sendError(res, 400, [errorMessage(error, 'QUESTION_FORMAT_INVALID')]);
        }
      }

      // Validate poll input if name or details changed
      const validation = validatePollInput({ 
        name: name ?? poll.name, 
        details: details ?? poll.details, 
        questions 
      });
      if (!validation.ok) {
        return sendError(res, 400, validation.errors);
      }

      await db.db
        .update(pollsTable)
        .set({
          name: name?.trim() ?? poll.name,
          details: details?.trim() ?? poll.details,
          questions: updatedQuestions,
          active: active !== undefined ? Boolean(active) : poll.active,
          updatedAt: now
        })
        .where(eq(pollsTable.adminHash, poll.adminHash));

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating poll:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // POST /api/polls/:pollId/answers/draft
  app.post('/api/polls/:pollId/answers/draft', async (req: Request, res: Response) => {
    try {
      const pollId = req.params.pollId as string;
      const { answers, time } = req.body;

      // Get poll
      const [poll] = await db.db
        .select({ questions: pollsTable.questions })
        .from(pollsTable)
        .where(eq(pollsTable.pollId, pollId))
        .limit(1);

      if (!poll) {
        return sendError(res, 404, [errorCodes.POLL_NOT_FOUND]);
      }

      const questions = JSON.parse(poll.questions);

      // Validate answers (draft can be incomplete)
      const validation = validateAnswers({
        questions,
        answers: answers || {},
        final: false
      });

      if (!validation.ok) {
        return sendError(res, 400, validation.errors);
      }

      const userInfo = `${req.ip ?? 'unknown'} ${req.get('user-agent') ?? ''}`.trim();
      const now = new Date().toISOString();

      const answerJson = JSON.stringify(answers || {});
      const answerTime = time || now;

      await db.db
        .insert(answersTable)
        .values({
          id: crypto.randomUUID(),
          userId: req.userId,
          pollId,
          userInfo,
          answers: answerJson,
          time: answerTime,
          status: 'draft',
          createdAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [answersTable.pollId, answersTable.userId],
          set: {
            answers: answerJson,
            time: answerTime,
            userInfo,
            status: 'draft',
            updatedAt: now
          }
        });

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving draft:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // POST /api/polls/:pollId/answers/submit
  app.post('/api/polls/:pollId/answers/submit', async (req: Request, res: Response) => {
    try {
      const pollId = req.params.pollId as string;
      const { answers, time } = req.body;

      // Get poll
      const [poll] = await db.db
        .select({ questions: pollsTable.questions })
        .from(pollsTable)
        .where(eq(pollsTable.pollId, pollId))
        .limit(1);

      if (!poll) {
        return sendError(res, 404, [errorCodes.POLL_NOT_FOUND]);
      }

      const questions = JSON.parse(poll.questions);

      // Validate answers (final submit must be complete)
      const validation = validateAnswers({
        questions,
        answers: answers || {},
        final: true
      });

      if (!validation.ok) {
        return sendError(res, 400, validation.errors);
      }

      const userInfo = `${req.ip ?? 'unknown'} ${req.get('user-agent') ?? ''}`.trim();
      const now = new Date().toISOString();

      const answerJson = JSON.stringify(answers || {});
      const answerTime = time || now;

      await db.db
        .insert(answersTable)
        .values({
          id: crypto.randomUUID(),
          userId: req.userId,
          pollId,
          userInfo,
          answers: answerJson,
          time: answerTime,
          status: 'submitted',
          createdAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [answersTable.pollId, answersTable.userId],
          set: {
            answers: answerJson,
            time: answerTime,
            userInfo,
            status: 'submitted',
            updatedAt: now
          }
        });

      res.json({ success: true });
    } catch (error) {
      console.error('Error submitting answer:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // GET /api/admin/poll/results.csv
  app.get('/api/admin/poll/results.csv', async (req: Request, res: Response) => {
    // Accept adminHash from query param (browser download link can't send headers)
    if (req.query.adminHash && !req.headers['x-poll-admin-hash']) {
      req.headers['x-poll-admin-hash'] = req.query.adminHash as string;
    }
    try {
      const poll = await requireAdminPoll(req, res);
      if (!poll) return;

      const questions: PollQuestion[] = JSON.parse(poll.questions);

      const submittedAnswers = await db.db
        .select({
          time: answersTable.time,
          userInfo: answersTable.userInfo,
          answers: answersTable.answers
        })
        .from(answersTable)
        .where(and(eq(answersTable.pollId, poll.pollId), eq(answersTable.status, 'submitted')))
        .orderBy(answersTable.createdAt);

      const headers = ['time', 'user_info', ...questions.map(q => q.name)];

      const results = submittedAnswers.map((row: any) => {
        const answerMap: Record<string, { selectedOptions?: string[]; text?: string }> = JSON.parse(row.answers);
        const ip = row.userInfo.split(' ')[0];
        const record: Record<string, string> = { time: row.time, user_info: ip };
        questions.forEach((q, i) => {
          const answer = answerMap[String(i)] || {};
          const selected = answer.selectedOptions || [];
          const parts = selected.map(opt =>
            (opt === 'text' || opt === 'текст') ? (answer.text || '') : opt
          ).filter(Boolean);
          record[q.name] = parts.length > 0 ? parts.join(';') : (answer.text || '');
        });
        return record;
      });

      const csv = toCsv(headers, results);
      
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="poll-results-${poll.pollId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    sendError(res, 404, ['NOT_FOUND']);
  });

  return app;
}
