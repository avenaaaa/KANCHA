import type { Request, Response } from 'express';
import * as moderationService from '../services/moderation.service.js';
import { requireUserId } from '../middlewares/auth.js';
import type { CreateReportInput, ReportsQuery, ResolveReportInput } from '../schemas/moderation.schema.js';

/** HU-11 (KAN-17): reportar a un compañero y el panel del administrador. */
export const moderationController = {
  /** POST /matches/:id/reports */
  async report(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.status(201).json(await moderationService.reportTeammate(id, requireUserId(req), req.body as CreateReportInput));
  },

  /** GET /admin/reports */
  async list(req: Request, res: Response): Promise<void> {
    const { status } = req.query as unknown as ReportsQuery;
    res.json(await moderationService.listReports(requireUserId(req), status));
  },

  /** GET /admin/reports/:id */
  async detail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await moderationService.getReport(requireUserId(req), id));
  },

  /** PATCH /admin/reports/:id */
  async resolve(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await moderationService.resolveReport(requireUserId(req), id, req.body as ResolveReportInput));
  },
};
