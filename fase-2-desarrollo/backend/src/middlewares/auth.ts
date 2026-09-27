import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export interface JwtPayload {
  sub: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized('Falta el token de autenticación'));
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
    next();
  } catch {
    next(unauthorized('Token inválido o expirado'));
  }
}
