import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/env';

import { registerRoomSocketHandlers } from './room.socket';

/**
 * Initialize Socket.IO instance and register core socket handlers.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Register room & lobby handlers
    registerRoomSocketHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  return io;
};
