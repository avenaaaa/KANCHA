import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/common.schema.js';

/** Perfil propio y carta pública de jugador (HU-01; la carta completa es HU-02). */
export const usersRouter = Router();

usersRouter.get('/users/me', authenticate, usersController.me);
usersRouter.get('/users/me/matches', authenticate, usersController.myMatches);
usersRouter.get('/users/:id', authenticate, validate(idParamSchema, 'params'), usersController.byId);
