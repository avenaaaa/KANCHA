import type { Request, Response } from 'express';
import * as matchingService from '../services/matching.service.js';
import * as paymentService from '../services/payment.service.js';
import * as honorService from '../services/honor.service.js';
import { requireUserId } from '../middlewares/auth.js';
import type { AttendanceInput } from '../schemas/rating.schema.js';

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

  /** KAN-30: el organizador marca "asistió" o "no se presentó" al terminar el partido. */
  async attendance(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { attended } = req.body as AttendanceInput;
    res.json(await honorService.recordAttendance(id, requireUserId(req), attended));
  },
};
