import type { Request, Response } from 'express';
import * as honorService from '../services/honor.service.js';
import { requireUserId } from '../middlewares/auth.js';
import type { CreateRatingInput } from '../schemas/rating.schema.js';

export const ratingsController = {
  /** POST /matches/:id/ratings (HU-06). Responde el honor ya recalculado del calificado (HU-07). */
  async create(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const input = req.body as CreateRatingInput;
    const honor = await honorService.rateTeammate(id, requireUserId(req), input);
    res.status(201).json({ ratedId: input.ratedId, honor });
  },

  /** GET /matches/:id/ratings/pending (HU-06). */
  async pending(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await honorService.pendingRatings(id, requireUserId(req)));
  },
};
