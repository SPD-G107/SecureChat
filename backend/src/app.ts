import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { query } from './config/database.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import keysRoutes from './routes/keys.routes.js';
import conversationsRoutes from './routes/conversations.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import adminRoutes from './routes/admin.routes.js';

export const app = express();

// Security HTTP headers
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins (local, IP, or domain) in development and deployment
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Core Health Check (with live MySQL connection pool check)
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      service: 'SecureChat Backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV,
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      service: 'SecureChat Backend',
      database: 'disconnected',
      error: 'Database connection pool unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// Mounted Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/keys', keysRoutes);
app.use('/api/v1/conversations', conversationsRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/admin', adminRoutes);

// Error handling middleware
app.use(errorHandler);
