import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);

// Sprint 4 → auth.routes.ts (HU-01) y matches.routes.ts (HU-03)
// Sprint 5 → ratings.routes.ts (HU-06) y payments.routes.ts (HU-08, HU-09)
// Sprint 6 → participations.routes.ts (HU-05)
