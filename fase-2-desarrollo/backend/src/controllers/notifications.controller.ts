import type { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.js';
import type { PreferencesInput } from '../schemas/notification.schema.js';
import { requireUserId } from '../middlewares/auth.js';

/** HU-10 (KAN-16): bandeja de avisos y qué avisos acepta recibir cada usuario. */
export const notificationsController = {
  async inbox(req: Request, res: Response): Promise<void> {
    res.json(await notificationService.inbox(requireUserId(req)));
  },

  async markRead(req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(await notificationService.markRead(id, requireUserId(req)));
  },

  async preferences(req: Request, res: Response): Promise<void> {
    res.json(await notificationService.getPreferences(requireUserId(req)));
  },

  async savePreferences(req: Request, res: Response): Promise<void> {
    res.json(await notificationService.savePreferences(requireUserId(req), req.body as PreferencesInput));
  },
};
