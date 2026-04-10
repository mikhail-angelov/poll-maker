import { describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { sessionMiddleware, type SessionRequest } from './session';

describe('sessionMiddleware', () => {
  it('replaces a blank stored userId before attaching it to the request', () => {
    const blankUserId = ' '.repeat(20);
    const req = {
      headers: {
        cookie: `poll_maker_session=${blankUserId}`
      }
    } as Request;
    let cookieValue = '';
    const res = {
      cookie: (_name: string, value: string) => {
        cookieValue = value;
      }
    } as unknown as Response;

    sessionMiddleware(req, res, () => {});

    expect((req as SessionRequest).userId).toHaveLength(20);
    expect((req as SessionRequest).userId.trim()).toHaveLength(20);
    expect((req as SessionRequest).userId).not.toBe(blankUserId);
    expect(cookieValue).toBe((req as SessionRequest).userId);
  });
});
