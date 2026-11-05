import type { Request, Response } from 'express';
import * as matchingService from '../services/matching.service.js';
import * as paymentService from '../services/payment.service.js';
import { requireUserId } from '../middlewares/auth.js';

export const participationsController = {
  async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const p = await matchingService.approve(id, requireUserId(req));
    res.json({ participationId: p.id, status: p.status, amountDue: p.amountDue });
  },

  /** HU-09: cancelar mi cupo; si estaba pagado, responde el reembolso y la retención. */
  async cancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json({ participationId: id, ...(await paymentService.cancelParticipation(id, requireUserId(req))) });
  },
};
