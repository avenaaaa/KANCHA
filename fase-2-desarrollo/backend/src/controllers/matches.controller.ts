import type { Request, Response } from 'express';
import * as matchService from '../services/match.service.js';
import * as matchingService from '../services/matching.service.js';
import type { CreateMatchInput, NearbyQuery } from '../schemas/match.schema.js';
import { requireUserId } from '../middlewares/auth.js';

export const matchesController = {
  async create(req: Request, res: Response): Promise<void> {
    const match = await matchService.publish(requireUserId(req), req.body as CreateMatchInput);
    res.status(201).json(match);
  },

  async nearby(req: Request, res: Response): Promise<void> {
    const matches = await matchingService.findNearby(req.query as unknown as NearbyQuery);
    res.json({ matches, count: matches.length });
  },

  async detail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await matchService.getDetail(id, requireUserId(req)));
  },

  async join(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const participation = await matchingService.join(id, requireUserId(req));
    res.status(201).json({ participationId: participation.id, status: participation.status });
  },
};
