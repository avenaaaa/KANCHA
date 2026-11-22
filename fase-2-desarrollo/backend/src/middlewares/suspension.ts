import type { NextFunction, Request, Response } from 'express';
import { assertCanAct } from '../services/moderation.service.js';
import { requireUserId } from './auth.js';

/** HU-11: un jugador suspendido no publica, no postula ni destaca. La regla vive en el servicio. Va después de authenticate. */
export async function requireActiveAccount(req: Request, _res: Response, next: NextFunction): Promise<void> {
  await assertCanAct(requireUserId(req));
  next();
}
