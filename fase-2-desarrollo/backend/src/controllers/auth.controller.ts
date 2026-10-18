import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

/** Los controladores traducen HTTP ↔ servicio. No contienen reglas de negocio. */
export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    res.json(result);
  },
};
