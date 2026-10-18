import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { matchesRouter } from './matches.routes.js';
import { participationsRouter } from './participations.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter); // HU-01
apiRouter.use(usersRouter); // HU-01 · perfil propio
apiRouter.use(matchesRouter); // HU-03, HU-04, HU-05
apiRouter.use(participationsRouter); // HU-05

// Sprint 7 → payments.routes.ts (HU-08, HU-09)
// Sprint 8 → ratings.routes.ts (HU-06, HU-07) y la carta completa de HU-02
