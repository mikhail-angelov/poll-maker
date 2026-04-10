import express, { type Request, type Response } from 'express';
import { nanoid } from 'nanoid';
import { sessionMiddleware, type SessionRequest } from './session';
import { parseQuestionFormat, serializeQuestionFormat } from '../shared/questionFormat';
import { validatePollInput, validateAnswers } from '../shared/validation';
import { errorCodes } from '../shared/errorCodes';
import type { PollQuestion, AnswerMap } from '../shared/types';
import type { Db } from './db/client';
import { toCsv } from './csv';

export function createApp(db: Db) {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(sessionMiddleware);

  // Helper function to send error responses
  function sendError(res: Response, status: number, errors: string[]) {
    res.status(status).json({ errors });
  }

  // Helper to require admin poll
  async function requireAdminPoll(req: Request, res: Response) {
    const adminHash = req.headers['x-poll-admin-hash'] as string;
    if (!adminHash) {
      sendError(res, 401, [errorCodes.ADMIN_HASH_REQUIRED]);
      return null;
    }

    const poll = await db.db.get(`
      SELECT * FROM polls WHERE admin_hash = ?
    `, [adminHash]);

    if (!poll) {
      sendError(res, 403, [errorCodes.ADMIN_HASH_INVALID]);
      return null;
    }

    return poll;
  }

  // GET /api/session
  app.get('/api/session', (req: SessionRequest, res: Response) => {
    res.json({ userId: req.userId });
  });

  // POST /api/polls
  app.post('/api/polls', async (req: SessionRequest, res: Response) => {
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
        return sendError(res, 400, [error.message || 'QUESTION_FORMAT_INVALID']);
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

      // Insert poll into database using raw SQL since drizzle proxy might have issues
      await db.db.run(`
        INSERT INTO polls (id, user_id, poll_id, admin_hash, name, details, questions, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, req.userId, pollId, adminHash, name.trim(), details.trim(), JSON.stringify(questions), 1, now, now]);

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
      const { pollId } = req.params;
      
      // Find poll by pollId using raw SQL
      const result = await db.db.get(`
        SELECT id, poll_id, name, details, questions, active
        FROM polls 
        WHERE poll_id = ?
      `, [pollId]);
      
      if (!result) {
        return sendError(res, 404, [errorCodes.POLL_NOT_FOUND]);
      }

      // Parse questions from JSON string
      const questions = JSON.parse(result.questions);

      // Return public poll data (without adminHash and userId)
      res.json({
        id: result.id,
        pollId: result.poll_id,
        name: result.name,
        details: result.details,
        questions,
        active: result.active === 1
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
      const answersResult = await db.db.all(`
        SELECT COUNT(*) as count FROM answers 
        WHERE poll_id = ? AND status = 'submitted'
      `, [poll.poll_id]);

      const submittedCount = answersResult[0]?.count || 0;
      const questions = JSON.parse(poll.questions);

      // Get recent submitted answers for display
      const recentAnswers = await db.db.all(`
        SELECT time, user_info, answers, status
        FROM answers 
        WHERE poll_id = ? AND status = 'submitted'
        ORDER BY created_at DESC
        LIMIT 50
      `, [poll.poll_id]);

      const results = recentAnswers.map((row: any) => {
        const answers = JSON.parse(row.answers);
        const answeredCount = Object.values(answers).filter((a: any) => 
          (a.selectedOptions && a.selectedOptions.length > 0) || (a.text && a.text.trim())
        ).length;

        return {
          time: row.time,
          user_info: row.user_info,
          answered_questions: answeredCount,
          answers: JSON.stringify(answers)
        };
      });

      res.json({
        poll: {
          id: poll.id,
          pollId: poll.poll_id,
          name: poll.name,
          details: poll.details,
          questions,
          active: poll.active === 1
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
          return sendError(res, 400, [error.message || 'QUESTION_FORMAT_INVALID']);
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

      await db.db.run(`
        UPDATE polls 
        SET name = ?, details = ?, questions = ?, active = ?, updated_at = ?
        WHERE admin_hash = ?
      `, [
        name?.trim() ?? poll.name,
        details?.trim() ?? poll.details,
        updatedQuestions,
        active !== undefined ? (active ? 1 : 0) : poll.active,
        now,
        poll.admin_hash
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating poll:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // POST /api/polls/:pollId/answers/draft
  app.post('/api/polls/:pollId/answers/draft', async (req: SessionRequest, res: Response) => {
    try {
      const { pollId } = req.params;
      const { answers, time } = req.body;

      // Get poll
      const poll = await db.db.get(`
        SELECT questions FROM polls WHERE poll_id = ?
      `, [pollId]);

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

      // Upsert draft answer
      await db.db.run(`
        INSERT INTO answers (id, user_id, poll_id, user_info, answers, time, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        ON CONFLICT(poll_id, user_id) DO UPDATE SET
          answers = ?, time = ?, user_info = ?, status = 'draft', updated_at = ?
      `, [
        crypto.randomUUID(),
        req.userId,
        pollId,
        userInfo,
        JSON.stringify(answers || {}),
        time || now,
        now,
        now,
        JSON.stringify(answers || {}),
        time || now,
        userInfo,
        now
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving draft:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // POST /api/polls/:pollId/answers/submit
  app.post('/api/polls/:pollId/answers/submit', async (req: SessionRequest, res: Response) => {
    try {
      const { pollId } = req.params;
      const { answers, time } = req.body;

      // Get poll
      const poll = await db.db.get(`
        SELECT questions FROM polls WHERE poll_id = ?
      `, [pollId]);

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

      // Upsert and mark as submitted
      await db.db.run(`
        INSERT INTO answers (id, user_id, poll_id, user_info, answers, time, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
        ON CONFLICT(poll_id, user_id) DO UPDATE SET
          answers = ?, time = ?, user_info = ?, status = 'submitted', updated_at = ?
      `, [
        crypto.randomUUID(),
        req.userId,
        pollId,
        userInfo,
        JSON.stringify(answers || {}),
        time || now,
        now,
        now,
        JSON.stringify(answers || {}),
        time || now,
        userInfo,
        now
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error submitting answer:', error);
      sendError(res, 500, ['INTERNAL_SERVER_ERROR']);
    }
  });

  // GET /api/admin/poll/results.csv
  app.get('/api/admin/poll/results.csv', async (req: Request, res: Response) => {
    try {
      const poll = await requireAdminPoll(req, res);
      if (!poll) return;

      const answers = await db.db.all(`
        SELECT time, user_info, answers
        FROM answers 
        WHERE poll_id = ? AND status = 'submitted'
        ORDER BY created_at
      `, [poll.poll_id]);

      const results = answers.map((row: any) => {
        const answers = JSON.parse(row.answers);
        const answeredCount = Object.values(answers).filter((a: any) => 
          (a.selectedOptions && a.selectedOptions.length > 0) || (a.text && a.text.trim())
        ).length;

        return {
          time: row.time,
          user_info: row.user_info,
          answered_questions: answeredCount,
          answers: JSON.stringify(answers)
        };
      });

      const csv = toCsv(results);
      
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="poll-results-${poll.poll_id}.csv"`);
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