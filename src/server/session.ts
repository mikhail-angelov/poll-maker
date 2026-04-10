import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const cookieName = 'poll_maker_session';
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

export type SessionRequest = Request & { userId: string };

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.split('=')[1];
  const userId = existing && existing.length === 20 ? existing : nanoid(20);

  res.cookie(cookieName, userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });

  (req as SessionRequest).userId = userId;
  next();
}