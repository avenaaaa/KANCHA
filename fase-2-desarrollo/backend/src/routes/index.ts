import { Router } from 'express';
import { healthRouter } from './health.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);

// Sprint 5 → auth.routes.ts (HU-01) y matches.routes.ts (HU-03)
// Sprint 6 → búsqueda por radio en matches.routes.ts (HU-04) y participations.routes.ts (HU-05)
// Sprint 7 → payments.routes.ts (HU-08, HU-09)
// Sprint 8 → users.routes.ts (HU-02) y ratings.routes.ts (HU-06, HU-07)
