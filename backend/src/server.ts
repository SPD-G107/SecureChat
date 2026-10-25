import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { logger } from './utils/logger.js';
import { setupChatSockets } from './sockets/chat.socket.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupChatSockets(io);

server.listen(ENV.PORT, () => {
  logger.info(`SecureChat Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
  logger.info(`Running all internal libraries (MySQL + Argon2id + Socket.IO) without external APIs`);
});
