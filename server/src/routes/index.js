import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from './auth.routes.js';

const apiRouter = Router();

// Mount sub-routers
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

export default apiRouter;
