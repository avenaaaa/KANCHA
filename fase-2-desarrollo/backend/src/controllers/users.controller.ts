import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import * as matchService from '../services/match.service.js';
import { requireUserId } from '../middlewares/auth.js';

export const usersController = {
  async me(req: Request, res: Response): Promise<void> {
    res.json(await authService.getProfile(requireUserId(req), { isSelf: true }));
  },

  async myMatches(req: Request, res: Response): Promise<void> {
    res.json({ matches: await matchService.listForUser(requireUserId(req)) });
  },

  async byId(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await authService.getProfile(id, { isSelf: id === requireUserId(req) }));
  },
};
