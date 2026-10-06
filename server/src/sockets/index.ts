import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isOriginAllowed } from '../config/cors';
import { registerRoomSocketHandlers } from './room.socket';

/**
 * Initialize Socket.IO instance and register core socket handlers.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isOriginAllowed(origin));
      },
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
