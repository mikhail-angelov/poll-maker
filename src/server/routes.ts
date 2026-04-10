import express, { type Request, type Response } from 'express';
import { nanoid } from 'nanoid';
import { sessionMiddleware, type SessionRequest } from './session';
import { parseQuestionFormat, serializeQuestionFormat } from '../shared/questionFormat';
import { validatePollInput } from '../shared/validation';
import { errorCodes } from '../shared/errorCodes';
import type { PollQuestion } from '../shared/types';
import type { Db } from './db/client';

export function createApp(db: Db) {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(sessionMiddleware);

  // Helper function to send error responses
  function sendError(res: Response, status: number, errors: string[]) {
    res.status(status).json({ errors });
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

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    sendError(res, 404, ['NOT_FOUND']);
  });

  return app;
}