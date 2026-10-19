import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

/** HU-01 (KAN-7). */
export const authRouter = Router();

authRouter.post('/auth/register', validate(registerSchema), authController.register);
authRouter.post('/auth/login', validate(loginSchema), authController.login);
