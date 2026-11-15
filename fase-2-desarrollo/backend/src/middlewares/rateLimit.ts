import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/**
 * S-12 (OWASP API4): sin límite, el login admite fuerza bruta y cada intento cuesta
 * un bcrypt de costo 12. El límite es por IP; detrás de un proxy hay que definir
 * TRUST_PROXY para que la IP sea la del cliente y no la del proxy.
 */
const limiter = (limit: number, windowMs: number, skipSuccessfulRequests: boolean) =>
  rateLimit({
    limit,
    windowMs,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.')),
  });

/** Solo cuentan los intentos fallidos: entrar bien muchas veces (una demo) no bloquea a nadie. */
export const loginLimiter = limiter(env.LOGIN_RATE_LIMIT, 15 * 60_000, true);

/** Cada cuenta creada cuenta: frena el registro masivo. */
export const registerLimiter = limiter(env.REGISTER_RATE_LIMIT, 60 * 60_000, false);
