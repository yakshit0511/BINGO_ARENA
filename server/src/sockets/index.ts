import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { registerRoomSocketHandlers } from './room.socket';

let ioInstance: Server | null = null;

/**
 * Returns active Socket.IO server instance if initialized.
 */
export const getIO = (): Server | null => ioInstance;

/**
 * Initialize Socket.IO instance and register core socket handlers.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance = io;

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
