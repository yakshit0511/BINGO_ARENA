import { Server, Socket } from 'socket.io';
import { roomService } from '../services/room.service';
import { RoomModel } from '../models/room.model';
import { PlayerModel } from '../models/player.model';

interface RoomJoinPayload {
  roomCode: string;
  playerId: string;
}

interface RoomLeavePayload {
  roomCode: string;
  playerId: string;
}

interface RoomRequestStatePayload {
  roomCode: string;
}

type AckCallback = (response: {
  success: boolean;
  message?: string;
  room?: unknown;
}) => void;

/**
 * Register room & lobby Socket.IO events for a connected client socket.
 */
export function registerRoomSocketHandlers(io: Server, socket: Socket): void {
  const getSocketRoomName = (roomCode: string) => `room:${roomCode.trim().toUpperCase()}`;

  /**
   * Event: room:join
   * Attaches a validated player session to a Socket.IO room.
   */
  socket.on(
    'room:join',
    async (payload: RoomJoinPayload, callback?: AckCallback) => {
      try {
        if (!payload || typeof payload !== 'object') {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Invalid payload.' });
          }
          return;
        }

        const roomCode = String(payload.roomCode || '').trim().toUpperCase();
        const playerId = String(payload.playerId || '').trim();

        if (!roomCode || roomCode.length !== 6 || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Valid room code and player ID are required.' });
          }
          return;
        }

        // 1. Authoritative DB validation of Room
        const room = await RoomModel.findOne({ roomCode });
        if (!room) {
          if (typeof callback === 'function') {
            callback({ success: false, message: `Room "${roomCode}" not found.` });
          }
          return;
        }

        if (room.status === 'finished') {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'This room has already ended or closed.' });
          }
          return;
        }

        // 2. Authoritative DB validation of Player
        const player = await PlayerModel.findOne({ roomCode, playerId });
        if (!player || !room.players.includes(playerId)) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Invalid player session for this room.' });
          }
          return;
        }

        // 3. Bind player metadata to socket
        socket.data.roomCode = roomCode;
        socket.data.playerId = playerId;
        socket.data.isHost = player.isHost;

        // 4. Join Socket.IO room
        const socketRoomName = getSocketRoomName(roomCode);
        await socket.join(socketRoomName);

        // 5. Update DB status: connected
        const updateRes = await roomService.setPlayerConnectionStatus(roomCode, playerId, true);
        if (!updateRes.success || !updateRes.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Failed to update connection state.' });
          }
          return;
        }

        const publicRoom = updateRes.data;

        // 6. Broadcast updated room state to all room members
        io.to(socketRoomName).emit('room:state', publicRoom);

        console.log(`[Socket.IO] Player "${player.name}" (${playerId}) joined socket room ${socketRoomName}`);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Joined socket room successfully',
            room: publicRoom,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in room:join:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error joining socket room.' });
        }
      }
    }
  );

  /**
   * Event: room:leave
   * Explicit intentional departure from room.
   */
  socket.on(
    'room:leave',
    async (payload: RoomLeavePayload, callback?: AckCallback) => {
      try {
        if (!payload || typeof payload !== 'object') {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Invalid payload.' });
          }
          return;
        }

        const roomCode = String(payload.roomCode || '').trim().toUpperCase();
        const playerId = String(payload.playerId || '').trim();

        if (!roomCode || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Room code and player ID are required.' });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);

        // Perform authoritative leave operation
        const leaveRes = await roomService.leaveRoom(roomCode, playerId);
        if (!leaveRes.success) {
          if (typeof callback === 'function') {
            callback({ success: false, message: leaveRes.message });
          }
          return;
        }

        // Check if host closed room
        if (leaveRes.data?.status === 'finished') {
          io.to(socketRoomName).emit('room:closed', {
            roomCode,
            message: 'The host has closed this game room.',
          });
          // Leave socket room
          await socket.leave(socketRoomName);
        } else {
          // Normal player left: broadcast updated room state
          await socket.leave(socketRoomName);
          const stateRes = await roomService.getRoom(roomCode);
          if (stateRes.success && stateRes.data) {
            io.to(socketRoomName).emit('room:state', stateRes.data);
          }
        }

        delete socket.data.roomCode;
        delete socket.data.playerId;

        if (typeof callback === 'function') {
          callback({ success: true, message: 'Left room successfully' });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in room:leave:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error leaving room.' });
        }
      }
    }
  );

  /**
   * Event: room:request-state
   * On-demand authoritative state sync.
   */
  socket.on(
    'room:request-state',
    async (payload: RoomRequestStatePayload) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        if (!roomCode) return;

        const res = await roomService.getRoom(roomCode);
        if (res.success && res.data) {
          socket.emit('room:state', res.data);
        }
      } catch (error) {
        console.error('[Socket.IO] Error in room:request-state:', error);
      }
    }
  );

  /**
   * Event: board:submit
   * Validates, saves, and broadcasts a player's Bingo board submission.
   */
  socket.on(
    'board:submit',
    async (
      payload: { roomCode: string; playerId: string; cells: unknown },
      callback?: AckCallback
    ) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || '').trim();
        const cells = payload?.cells;

        const result = await roomService.submitPlayerBoard(roomCode, playerId, cells);
        if (!result.success || !result.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('room:state', result.data.room);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Board submitted and locked successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in board:submit:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error submitting board.' });
        }
      }
    }
  );

  /**
   * Event: disconnecting
   * Handles unexpected network drop, tab closure, or browser refresh.
   */
  socket.on('disconnecting', async () => {
    try {
      const roomCode: string | undefined = socket.data?.roomCode;
      const playerId: string | undefined = socket.data?.playerId;

      if (!roomCode || !playerId) {
        return;
      }

      const socketRoomName = getSocketRoomName(roomCode);

      // Check if any other socket in the room belongs to the same playerId (multi-tab / fast reconnect)
      const socketsInRoom = await io.in(socketRoomName).fetchSockets();
      const hasOtherSocket = socketsInRoom.some(
        (s) => s.id !== socket.id && s.data?.playerId === playerId
      );

      if (!hasOtherSocket) {
        // Mark player offline in MongoDB without deleting their participation
        const updateRes = await roomService.setPlayerConnectionStatus(roomCode, playerId, false);
        if (updateRes.success && updateRes.data) {
          io.to(socketRoomName).emit('room:state', updateRes.data);
          console.log(`[Socket.IO] Player (${playerId}) marked disconnected in room ${roomCode}`);
        }
      }
    } catch (error) {
      console.error('[Socket.IO] Error handling socket disconnecting:', error);
    }
  });
}
