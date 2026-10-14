import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Core Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. Request Parsers with payload size limits (Defense in Depth)
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser()); // Enables reading req.cookies

// 3. API Routes (Versioned under /api/v1)
app.use('/api/v1', apiRouter);

// 4. Catch-all for unhandled routes (404)
app.use(notFound);

// 5. Global Centralized Error Handler
app.use(errorHandler);

export default app;
