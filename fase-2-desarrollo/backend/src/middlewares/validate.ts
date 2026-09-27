import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/** Valida y NORMALIZA la entrada. Nunca se omite, ni en endpoints internos. */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    Object.defineProperty(req, source, { value: result.data, writable: true });
    next();
  };
