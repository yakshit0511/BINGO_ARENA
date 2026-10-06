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

        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const playerId = payload?.playerId ? String(payload.playerId).trim() : '';

        if (!roomCode || roomCode.length !== 6) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Valid 6-character room code is required.' });
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

        if (room.status === 'closed') {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'The room has already been closed.' });
          }
          return;
        }

        // 2. ALWAYS join Socket.IO room channel so client receives broadcasts
        const socketRoomName = getSocketRoomName(roomCode);
        await socket.join(socketRoomName);
        socket.data.roomCode = roomCode;

        // 3. If playerId is provided, validate and associate player
        let publicRoom: any = null;
        if (playerId) {
          const player = await PlayerModel.findOne({ roomCode, playerId });
          if (player) {
            socket.data.playerId = playerId;
            socket.data.isHost = player.isHost;

            const updateRes = await roomService.setPlayerConnectionStatus(roomCode, playerId, true);
            if (updateRes.success && updateRes.data) {
              publicRoom = updateRes.data;
              io.to(socketRoomName).emit('room:state', publicRoom);
            }
            console.log(`[Socket.IO] Player "${player.name}" (${playerId}) joined socket room ${socketRoomName}`);
          }
        }

        if (!publicRoom) {
          const roomRes = await roomService.getRoom(roomCode);
          if (roomRes.success && roomRes.data) {
            publicRoom = roomRes.data;
          }
        }

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
   * Event: room:turn-order:update
   * Host updates player calling order before starting the game.
   */
  socket.on(
    'room:turn-order:update',
    async (
      payload: { roomCode: string; playerId: string; playerOrder: unknown },
      callback?: AckCallback
    ) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || '').trim();
        const playerOrder = payload?.playerOrder;

        const result = await roomService.updateTurnOrder(roomCode, playerId, playerOrder);
        if (!result.success || !result.data) {
          socket.emit('game:error', { message: result.message });
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('room:turn-order:updated', {
          roomCode,
          turnOrder: result.data.turnOrder,
        });
        io.to(socketRoomName).emit('room:state', result.data);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Turn order updated successfully',
            room: result.data,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in room:turn-order:update:', error);
        socket.emit('game:error', { message: 'Internal server error updating turn order.' });
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error updating turn order.' });
        }
      }
    }
  );

  /**
   * Event: game:start
   * Authoritatively starts the match (Host only).
   */
  socket.on(
    'game:start',
    async (
      payload: { roomCode: string; playerId: string; playerOrder?: unknown },
      callback?: AckCallback
    ) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || '').trim();
        const playerOrder = payload?.playerOrder;

        const result = await roomService.startGame(roomCode, playerId, playerOrder);
        if (!result.success || !result.data) {
          socket.emit('game:error', { message: result.message });
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        const startPayload = { room: result.data.room, game: result.data.game };
        io.to(socketRoomName).emit('game:started', startPayload);
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        console.log(`[Socket.IO] Game started in room ${roomCode}. First turn: ${result.data.game.currentPlayerId}`);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Game started successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:start:', error);
        socket.emit('game:error', { message: 'Internal server error starting game.' });
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error starting game.' });
        }
      }
    }
  );

  /**
   * Event: game:advance-turn
   * Turn advancement foundation helper.
   */
  socket.on(
    'game:advance-turn',
    async (
      payload: { roomCode: string; playerId?: string },
      callback?: AckCallback
    ) => {
      try {
        const roomCode = String(payload?.roomCode || '').trim().toUpperCase();
        const playerId = payload?.playerId ? String(payload.playerId).trim() : undefined;

        const result = await roomService.advanceTurn(roomCode, playerId);
        if (!result.success || !result.data) {
          socket.emit('game:error', { message: result.message });
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Turn advanced successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:advance-turn:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error advancing turn.' });
        }
      }
    }
  );

  /**
   * Event: game:number:call
   * Authoritative number call event.
   */
  socket.on(
    'game:number:call',
    async (
      payload: { roomCode: string; number: number; playerId?: string },
      callback?: AckCallback
    ) => {
      try {
        if (!payload || typeof payload !== 'object') {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Invalid payload.' });
          }
          return;
        }

        const roomCode = String(payload.roomCode || socket.data?.roomCode || '')
          .trim()
          .toUpperCase();
        // Server authoritative: prioritize authenticated socket session
        const requestingPlayerId =
          socket.data?.playerId || (payload.playerId ? String(payload.playerId).trim() : '');

        if (!roomCode || !requestingPlayerId) {
          socket.emit('game:error', { message: 'Identification failed. Please rejoin room.' });
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Identification failed.' });
          }
          return;
        }

        const result = await roomService.callNumber(roomCode, requestingPlayerId, payload.number);

        if (!result.success || !result.data) {
          socket.emit('game:error', { message: result.message });
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('game:number:called', result.data);
        if (result.data.winner) {
          io.to(socketRoomName).emit('game:won', result.data.winner);
        } else if (result.data.game.status === 'no_winner') {
          io.to(socketRoomName).emit('game:no_winner', {
            roomCode,
            totalCalls: result.data.game.calledNumbers.length,
            message: 'All numbers have been called. No player completed the winning word.',
          });
        }
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        console.log(
          `[Socket.IO] Number ${result.data.calledNumber} called by ${requestingPlayerId} in room ${roomCode}`
        );

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Number called successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:number:call:', error);
        socket.emit('game:error', { message: 'Internal server error calling number.' });
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error calling number.' });
        }
      }
    }
  );

  /**
   * Event: game:restart
   * Host restarts a completed, no-winner, or won match into a new round.
   */
  socket.on(
    'game:restart',
    async (payload: { roomCode: string; playerId: string }, callback?: AckCallback) => {
      try {
        const roomCode = String(payload?.roomCode || socket.data?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || socket.data?.playerId || '').trim();

        if (!roomCode || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Room code and player ID are required.' });
          }
          return;
        }

        const result = await roomService.restartGame(roomCode, playerId);
        if (!result.success || !result.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('game:restarted', result.data.game);
        io.to(socketRoomName).emit('game:started', result.data.game);
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Match restarted successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:restart:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error restarting match.' });
        }
      }
    }
  );

  /**
   * Event: game:continue
   * Host continues a won match into the next round.
   */
  socket.on(
    'game:continue',
    async (payload: { roomCode: string; playerId: string }, callback?: AckCallback) => {
      try {
        const roomCode = String(payload?.roomCode || socket.data?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || socket.data?.playerId || '').trim();

        if (!roomCode || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Room code and player ID are required.' });
          }
          return;
        }

        const result = await roomService.continueGame(roomCode, playerId);
        if (!result.success || !result.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('game:continued', result.data.game);
        io.to(socketRoomName).emit('game:started', result.data.game);
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'New round started successfully',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:continue:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error continuing match.' });
        }
      }
    }
  );

  /**
   * Event: game:end
   * Host ends the match and sends all clients to Results.
   */
  socket.on(
    'game:end',
    async (payload: { roomCode: string; playerId: string }, callback?: AckCallback) => {
      try {
        const roomCode = String(payload?.roomCode || socket.data?.roomCode || '').trim().toUpperCase();
        const playerId = String(payload?.playerId || socket.data?.playerId || '').trim();

        if (!roomCode || !playerId) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Room code and player ID are required.' });
          }
          return;
        }

        const result = await roomService.endGame(roomCode, playerId);
        if (!result.success || !result.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        const socketRoomName = getSocketRoomName(roomCode);
        io.to(socketRoomName).emit('game:ended', result.data.game);
        io.to(socketRoomName).emit('game:state', result.data.game);
        io.to(socketRoomName).emit('room:state', result.data.room);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'Match ended by host',
            room: result.data.room,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:end:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error ending match.' });
        }
      }
    }
  );

  /**
   * Event: room:close / room:end
   * Host closes the entire room session permanently.
   */
  const handleRoomClose = async (payload: { roomCode: string; playerId: string }, callback?: AckCallback) => {
    try {
      const roomCode = String(payload?.roomCode || socket.data?.roomCode || '').trim().toUpperCase();
      const playerId = String(payload?.playerId || socket.data?.playerId || '').trim();

      if (!roomCode || !playerId) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Room code and player ID are required.' });
        }
        return;
      }

      const result = await roomService.closeRoom(roomCode, playerId);
      if (!result.success || !result.data) {
        if (typeof callback === 'function') {
          callback({ success: false, message: result.message });
        }
        return;
      }

      const socketRoomName = getSocketRoomName(roomCode);
      io.to(socketRoomName).emit('room:closed', {
        roomCode,
        message: 'The host has closed this room.',
      });
      if (result.data.game) {
        io.to(socketRoomName).emit('game:state', result.data.game);
      }
      io.to(socketRoomName).emit('room:state', result.data.room);

      if (typeof callback === 'function') {
        callback({
          success: true,
          message: 'Room closed by host',
          room: result.data.room,
        });
      }
    } catch (error) {
      console.error('[Socket.IO] Error closing room:', error);
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Internal server error closing room.' });
      }
    }
  };

  socket.on('room:close', handleRoomClose);
  socket.on('room:end', handleRoomClose);

  /**
   * Event: game:request-state
   * State synchronization upon refresh/reconnect.
   */
  socket.on(
    'game:request-state',
    async (payload: { roomCode: string }, callback?: AckCallback) => {
      try {
        const roomCode = String(payload?.roomCode || socket.data?.roomCode || '')
          .trim()
          .toUpperCase();
        if (!roomCode) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Room code is required.' });
          }
          return;
        }

        const result = await roomService.getRoom(roomCode);
        if (!result.success || !result.data) {
          if (typeof callback === 'function') {
            callback({ success: false, message: result.message });
          }
          return;
        }

        socket.emit('game:state', result.data.game);
        socket.emit('room:state', result.data);

        if (typeof callback === 'function') {
          callback({
            success: true,
            message: 'State synchronized',
            room: result.data,
          });
        }
      } catch (error) {
        console.error('[Socket.IO] Error in game:request-state:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Internal server error requesting state.' });
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
