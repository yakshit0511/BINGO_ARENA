import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { validateCreateRoomInput, validateJoinRoomInput } from '../utils/validation';
import { roomService } from '../services/room.service';
import { getIO } from '../sockets';

/**
 * POST /api/rooms
 * Create a new multiplayer room.
 */
export async function createRoomHandler(req: Request, res: Response): Promise<void> {
  const validation = validateCreateRoomInput(req.body);

  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: validation.error,
    });
    return;
  }

  try {
    const result = await roomService.createRoom(validation.data);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in createRoomHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating room.',
    });
  }
}

/**
 * POST /api/rooms/join
 * Join an existing room with nickname.
 */
export async function joinRoomHandler(req: Request, res: Response): Promise<void> {
  const validation = validateJoinRoomInput(req.body);

  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: validation.error,
    });
    return;
  }

  try {
    const { roomCode, playerName } = validation.data;
    const result = await roomService.joinRoom(roomCode, playerName);

    if (result.success && result.data?.room) {
      const io: Server | null = req.app.get('io') || getIO();
      if (io) {
        io.to(`room:${roomCode.trim().toUpperCase()}`).emit('room:state', result.data.room);
      }
    }
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in joinRoomHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while joining room.',
    });
  }
}

/**
 * GET /api/rooms/:roomCode
 * Retrieve room details and active player roster.
 */
export async function getRoomHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim();

  if (!roomCode || roomCode.length !== 6) {
    res.status(400).json({
      success: false,
      message: 'A valid 6-character room code must be provided in the URL parameter.',
    });
    return;
  }

  try {
    const result = await roomService.getRoom(roomCode);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in getRoomHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving room.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/leave
 * Player leaves active room.
 */
export async function leaveRoomHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim();
  const rawPlayerId = req.body?.playerId;

  if (!roomCode || roomCode.length !== 6) {
    res.status(400).json({
      success: false,
      message: 'Valid 6-character room code is required.',
    });
    return;
  }

  if (typeof rawPlayerId !== 'string' || !rawPlayerId.trim()) {
    res.status(400).json({
      success: false,
      message: 'Player ID is required to leave room.',
    });
    return;
  }

  try {
    const result = await roomService.leaveRoom(roomCode, rawPlayerId.trim());

    if (result.success) {
      const io: Server | undefined = (req.app.get('io') as Server) || getIO();
      if (io) {
        const updatedRoom = await roomService.getRoom(roomCode);
        if (updatedRoom.success && updatedRoom.data) {
          io.to(`room:${roomCode.toUpperCase()}`).emit('room:state', updatedRoom.data);
        }
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in leaveRoomHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while leaving room.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/kick
 * Host removes/kicks a player from the room.
 */
export async function kickPlayerHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim().toUpperCase();
  const hostPlayerId = String(req.body?.hostPlayerId || '').trim();
  const targetPlayerId = String(req.body?.targetPlayerId || '').trim();

  if (!roomCode || !hostPlayerId || !targetPlayerId) {
    res.status(400).json({
      success: false,
      message: 'Room code, hostPlayerId, and targetPlayerId are required.',
    });
    return;
  }

  try {
    const result = await roomService.kickPlayer(roomCode, hostPlayerId, targetPlayerId);

    if (result.success && result.data) {
      try {
        const io: Server | undefined = (req.app.get('io') as Server) || getIO();
        if (io) {
          io.to(`room:${roomCode}`).emit('room:player:kicked', {
            kickedPlayerId: targetPlayerId,
            playerName: result.data.kickedPlayerName,
            message: 'You have been removed from the room by the host.',
          });
          io.to(`room:${roomCode}`).emit('room:state', result.data.room);
        }
      } catch (err) {
        console.warn('Socket broadcast warning in kickPlayerHandler:', err);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in kickPlayerHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while kicking player.',
    });
  }
}

/**
 * PATCH /api/rooms/:roomCode/marking-mode
 * Host updates room marking mode ('auto' | 'manual').
 */
export async function updateMarkingModeHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim().toUpperCase();
  const hostPlayerId = String(req.body?.hostPlayerId || '').trim();
  const markingMode = req.body?.markingMode === 'manual' ? 'manual' : 'auto';

  if (!roomCode || !hostPlayerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and hostPlayerId are required.',
    });
    return;
  }

  try {
    const result = await roomService.updateMarkingMode(roomCode, hostPlayerId, markingMode);

    if (result.success && result.data) {
      try {
        const io: Server | undefined = (req.app.get('io') as Server) || getIO();
        if (io) {
          io.to(`room:${roomCode}`).emit('room:state', result.data.room);
        }
      } catch (err) {
        console.warn('Socket broadcast warning in updateMarkingModeHandler:', err);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in updateMarkingModeHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating marking mode.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/players/:playerId/board
 * Validate, save, and lock a player's Bingo board arrangement.
 */
export async function submitBoardHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const rawPlayerId = Array.isArray(req.params.playerId)
    ? req.params.playerId[0]
    : req.params.playerId;

  const roomCode = String(rawCode || '').trim().toUpperCase();
  const playerId = String(rawPlayerId || '').trim();
  const cells = req.body?.cells ?? req.body?.board;

  if (!roomCode || roomCode.length !== 6) {
    res.status(400).json({
      success: false,
      message: 'Valid 6-character room code is required.',
    });
    return;
  }

  if (!playerId) {
    res.status(400).json({
      success: false,
      message: 'Player ID is required to submit board.',
    });
    return;
  }

  try {
    const result = await roomService.submitPlayerBoard(roomCode, playerId, cells);

    if (result.success && result.data) {
      // Broadcast updated room state via Socket.IO
      try {
        const io: Server | undefined = (req.app.get('io') as Server) || getIO();
        if (io) {
          io.to(`room:${roomCode}`).emit('room:state', result.data.room);
        }
      } catch (err) {
        console.warn('Socket broadcast warning in submitBoardHandler:', err);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in submitBoardHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting board.',
    });
  }
}

/**
 * GET /api/rooms/:roomCode/players/:playerId/board
 * Retrieve a player's saved board.
 */
export async function getBoardHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const rawPlayerId = Array.isArray(req.params.playerId)
    ? req.params.playerId[0]
    : req.params.playerId;

  const roomCode = String(rawCode || '').trim().toUpperCase();
  const playerId = String(rawPlayerId || '').trim();

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Valid room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.getPlayerBoard(roomCode, playerId);
    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in getBoardHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving board.',
    });
  }
}

/**
 * PUT /api/rooms/:roomCode/turn-order
 * Update the player turn order (Host only).
 */
export async function updateTurnOrderHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim().toUpperCase();
  const playerId = String(req.body?.playerId || '').trim();
  const playerOrder = req.body?.playerOrder;

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Valid room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.updateTurnOrder(roomCode, playerId, playerOrder);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('room:turn-order:updated', {
          roomCode,
          turnOrder: result.data.turnOrder,
        });
        io.to(`room:${roomCode}`).emit('room:state', result.data);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in updateTurnOrderHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating turn order.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/start
 * Authoritatively start the Bingo Arena game (Host only).
 */
export async function startGameHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim().toUpperCase();
  const playerId = String(req.body?.playerId || '').trim();
  const customOrder = req.body?.playerOrder || req.body?.customOrder;

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Valid room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.startGame(roomCode, playerId, customOrder);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        const startPayload = { room: result.data.room, game: result.data.game };
        io.to(`room:${roomCode}`).emit('game:started', startPayload);
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in startGameHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting game.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/advance-turn
 * Advance turn to next player in rotation (Foundation helper).
 */
export async function advanceTurnHandler(req: Request, res: Response): Promise<void> {
  const rawCode = Array.isArray(req.params.roomCode)
    ? req.params.roomCode[0]
    : req.params.roomCode;
  const roomCode = String(rawCode || '').trim().toUpperCase();
  const playerId = req.body?.playerId ? String(req.body.playerId).trim() : undefined;

  if (!roomCode) {
    res.status(400).json({
      success: false,
      message: 'Room code is required.',
    });
    return;
  }

  try {
    const result = await roomService.advanceTurn(roomCode, playerId);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in advanceTurnHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error advancing turn.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/call-number
 * Calls a number in the active game.
 */
export async function callNumberHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const playerId = String(req.body.playerId || '').trim();
  const number = req.body.number;

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.callNumber(roomCode, playerId, number);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:number:called', result.data);
        if (result.data.winner) {
          io.to(`room:${roomCode}`).emit('game:won', result.data.winner);
        }
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in callNumberHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error calling number.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/call-random
 * Random calling engine foundation.
 */
export async function callRandomNumberHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();

  if (!roomCode) {
    res.status(400).json({
      success: false,
      message: 'Room code is required.',
    });
    return;
  }

  try {
    const result = await roomService.callRandomNumber(roomCode);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:number:called', result.data);
        if (result.data.winner) {
          io.to(`room:${roomCode}`).emit('game:won', result.data.winner);
        }
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in callRandomNumberHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error calling random number.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/restart
 * Host restarts match without rebuilding room.
 */
export async function restartGameHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const playerId = String(req.body.playerId || '').trim();

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.restartGame(roomCode, playerId);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:started', result.data.game);
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in restartGameHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error restarting match.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/continue
 * Host continues to a new round after a win.
 */
export async function continueGameHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const playerId = String(req.body.playerId || '').trim();

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.continueGame(roomCode, playerId);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:continued', result.data.game);
        io.to(`room:${roomCode}`).emit('game:started', result.data.game);
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in continueGameHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error continuing match.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/game/end
 * Host explicitly ends the game.
 */
export async function endGameHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const playerId = String(req.body.playerId || '').trim();

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.endGame(roomCode, playerId);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('game:ended', result.data.game);
        io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in endGameHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error ending match.',
    });
  }
}

/**
 * POST /api/rooms/:roomCode/close
 * Host closes the entire room session.
 */
export async function closeRoomHandler(req: Request, res: Response): Promise<void> {
  const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
  const playerId = String(req.body.playerId || '').trim();

  if (!roomCode || !playerId) {
    res.status(400).json({
      success: false,
      message: 'Room code and player ID are required.',
    });
    return;
  }

  try {
    const result = await roomService.closeRoom(roomCode, playerId);

    if (result.success && result.data) {
      const io: Server | undefined = req.app.get('io');
      if (io) {
        io.to(`room:${roomCode}`).emit('room:closed', {
          roomCode,
          message: 'The host has closed this room.',
        });
        if (result.data.game) {
          io.to(`room:${roomCode}`).emit('game:state', result.data.game);
        }
        io.to(`room:${roomCode}`).emit('room:state', result.data.room);
      }
    }

    res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('Error in closeRoomHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error closing room.',
    });
  }
}
