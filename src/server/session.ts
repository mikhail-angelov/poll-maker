import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const cookieName = 'poll_maker_session';
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export type SessionRequest = Request & { userId: string };

function isStoredUserId(value: string | undefined): value is string {
  return /^[A-Za-z0-9_-]{20}$/.test(value ?? '');
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.split('=')[1];
  const userId = isStoredUserId(existing) ? existing : nanoid(20);

  res.cookie(cookieName, userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });

  req.userId = userId;
  next();
}
