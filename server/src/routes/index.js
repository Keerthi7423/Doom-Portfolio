import { Router } from 'express';
import healthRouter from './health.routes.js';

const router = Router();

// Mount routes: all future routes (/auth, /projects) will be registered here
router.use('/health', healthRouter);

export default router;
