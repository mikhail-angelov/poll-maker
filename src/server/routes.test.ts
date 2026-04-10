import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './routes';
import { createDb } from './db/client';
import { migrate } from './db/migrate';
import { answers, polls } from './db/schema';

describe('API Foundation', () => {
  let app: any;
  let db: any;

  beforeAll(async () => {
    db = createDb(':memory:');
    await migrate(db.sqlite);
    app = createApp(db);
  });

  afterAll(() => {
    db.sqlite.close();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await db.db.delete(answers);
    await db.db.delete(polls);
  });

  describe('GET /api/session', () => {
    it('sets a session cookie and returns userId', async () => {
      const response = await request(app)
        .get('/api/session')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('userId');
      expect(response.body.userId).toHaveLength(20);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('poll_maker_session=');
    });

    it('replaces a blank session cookie with a new userId', async () => {
      const blankUserId = ' '.repeat(20);

      const response = await request(app)
        .get('/api/session')
        .set('Cookie', `poll_maker_session=${blankUserId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.userId).toHaveLength(20);
      expect(response.body.userId.trim()).toHaveLength(20);
      expect(response.body.userId).not.toBe(blankUserId);
      expect(response.headers['set-cookie'][0]).toContain('poll_maker_session=');
    });
  });

  describe('POST /api/polls', () => {
    it('creates a poll and returns pollId, adminHash, and URLs', async () => {
      const sessionResponse = await request(app).get('/api/session');
      const userId = sessionResponse.body.userId;
      const sessionCookie = sessionResponse.headers['set-cookie'][0];

      const pollData = {
        name: 'Test Poll',
        details: 'Test details',
        questions: '# Q1\n## Question 1\n[] optional\n[] multiselect\n- A\n- B'
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', sessionCookie)
        .send(pollData)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('pollId');
      expect(response.body.pollId).toHaveLength(20);
      expect(response.body).toHaveProperty('adminHash');
      expect(response.body.adminHash).toHaveLength(20);
      expect(response.body).toHaveProperty('publicUrl');
      expect(response.body).toHaveProperty('adminUrl');
      expect(response.body.pollId).not.toBe(response.body.adminHash);
    });

    it('rejects missing poll name', async () => {
      const sessionResponse = await request(app).get('/api/session');
      const sessionCookie = sessionResponse.headers['set-cookie'][0];

      const pollData = {
        name: '',
        details: 'Test details',
        questions: '# Q1\n## Question 1\n- A'
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', sessionCookie)
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('POLL_NAME_REQUIRED');
    });

    it('rejects missing poll details', async () => {
      const sessionResponse = await request(app).get('/api/session');
      const sessionCookie = sessionResponse.headers['set-cookie'][0];

      const pollData = {
        name: 'Test Poll',
        details: '',
        questions: '# Q1\n## Question 1\n- A'
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', sessionCookie)
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('POLL_DETAILS_REQUIRED');
    });

    it('rejects empty questions string', async () => {
      const sessionResponse = await request(app).get('/api/session');
      const sessionCookie = sessionResponse.headers['set-cookie'][0];

      const pollData = {
        name: 'Test Poll',
        details: 'Test details',
        questions: ''
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', sessionCookie)
        .send(pollData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('QUESTIONS_REQUIRED');
    });
  });

  describe('GET /api/polls/:pollId', () => {
    it('returns public poll data without adminHash', async () => {
      const sessionResponse = await request(app).get('/api/session');
      const sessionCookie = sessionResponse.headers['set-cookie'][0];

      const pollData = {
        name: 'Test Poll',
        details: 'Test details',
        questions: '# Q1\n## Question 1\n- A\n- B'
      };

      const createResponse = await request(app)
        .post('/api/polls')
        .set('Cookie', sessionCookie)
        .send(pollData);

      const { pollId } = createResponse.body;

      const response = await request(app)
        .get(`/api/polls/${pollId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('pollId');
      expect(response.body.pollId).toBe(pollId);
      expect(response.body).toHaveProperty('name');
      expect(response.body.name).toBe('Test Poll');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('questions');
      expect(response.body.questions).toHaveLength(1);
      expect(response.body.questions[0]).toMatchObject({
        name: 'Q1',
        question: 'Question 1',
        options: ['A', 'B']
      });
      expect(response.body).toHaveProperty('active');
      expect(response.body).not.toHaveProperty('adminHash');
      expect(response.body).not.toHaveProperty('userId');
    });

    it('returns 404 for non-existent poll', async () => {
      const response = await request(app)
        .get('/api/polls/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('POLL_NOT_FOUND');
    });
  });
});
