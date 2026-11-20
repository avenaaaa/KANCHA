import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';
import { preferencesSchema } from '../schemas/notification.schema.js';

/** HU-10 (KAN-16): avisos dentro de la app. Cada usuario ve y marca solo los suyos. */
export const notificationsRouter = Router();

notificationsRouter.get('/users/me/notifications', authenticate, notificationsController.inbox);
notificationsRouter.patch(
  '/notifications/:id/read',
  authenticate,
  validate(idParamSchema, 'params'),
  notificationsController.markRead,
);
notificationsRouter.get('/users/me/notification-preferences', authenticate, notificationsController.preferences);
notificationsRouter.put(
  '/users/me/notification-preferences',
  authenticate,
  validate(preferencesSchema),
  notificationsController.savePreferences,
);
