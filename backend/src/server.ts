import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { logger } from './utils/logger.js';
import { setupChatSockets } from './sockets/chat.socket.js';
import { initDatabaseTables } from './config/database.js';

const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: 25 * 1024 * 1024,
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupChatSockets(io);
app.set('io', io);

// Initialize missing database tables if not existing
initDatabaseTables().catch(() => {});

server.listen(ENV.PORT, () => {
  logger.info(`SecureChat Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  logger.info(`Running all internal libraries (MySQL + Argon2id + Socket.IO) without external APIs`);
});
