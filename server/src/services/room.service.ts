import { RoomModel } from '../models/room.model';
import { PlayerModel } from '../models/player.model';
import {
  CreateRoomInput,
  PublicRoom,
  PublicPlayer,
  PublicGameState,
  IGameState,
  IPlayerDocument,
  IRoomDocument,
} from '../types';
import { generateUniqueRoomCode, generatePlayerId } from '../utils/roomCode';
import { validatePlayerBoard, validateTurnOrderInput } from '../utils/validation';

export interface ServiceResult<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

/**
 * Format internal game state document to safe public structure.
 */
export function formatPublicGameState(game?: IGameState): PublicGameState {
  if (!game) {
    return {
      status: 'waiting',
      startedAt: null,
      playerOrder: [],
      currentTurnIndex: 0,
      currentPlayerId: null,
      currentNumber: null,
      currentCallerName: null,
      turnNumber: 0,
      calledNumbers: [],
      callHistory: [],
      lastCalledNumbers: [],
      winnerId: null,
      winningWord: '',
      completedLetters: 0,
      gamePlayers: [],
    };
  }

  const formatRecord = (r: unknown) => {
    const rec = r as { number?: number; playerId?: string; playerName?: string; calledAt?: Date | string };
    if (!rec || typeof rec.number !== 'number') {
      return {
        number: Number(r) || 0,
        playerId: '',
        playerName: 'Contender',
        calledAt: new Date().toISOString(),
      };
    }
    return {
      number: rec.number,
      playerId: rec.playerId || '',
      playerName: rec.playerName || 'Contender',
      calledAt: rec.calledAt ? (rec.calledAt instanceof Date ? rec.calledAt.toISOString() : String(rec.calledAt)) : new Date().toISOString(),
    };
  };

  return {
    status: game.status || 'waiting',
    startedAt: game.startedAt ? game.startedAt.toISOString() : null,
    playerOrder: game.playerOrder || [],
    currentTurnIndex: game.currentTurnIndex || 0,
    currentPlayerId: game.currentPlayerId || null,
    currentNumber: game.currentNumber ?? null,
    currentCallerName: game.currentCallerName ?? null,
    turnNumber: game.turnNumber || 0,
    calledNumbers: game.calledNumbers || [],
    callHistory: Array.isArray(game.callHistory) ? game.callHistory.map(formatRecord) : [],
    lastCalledNumbers: Array.isArray(game.lastCalledNumbers) ? game.lastCalledNumbers.map(formatRecord) : [],
    winnerId: game.winnerId || null,
    winningWord: game.winningWord || '',
    completedLetters: game.completedLetters || 0,
    gamePlayers: game.gamePlayers || [],
  };
}

/**
 * Formats database room and player documents into safe public presentation.
 */
export function formatPublicRoom(
  room: IRoomDocument,
  players: IPlayerDocument[],
  hostPlayer?: IPlayerDocument | null
): PublicRoom {
  const publicPlayers: PublicPlayer[] = players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    isHost: p.isHost,
    isConnected: p.isConnected,
    hasSubmitted: p.hasSubmitted,
    joinedAt: p.joinedAt ? p.joinedAt.toISOString() : new Date().toISOString(),
  }));

  const hostName = hostPlayer ? hostPlayer.name : 'Unknown Host';
  const allSubmitted = players.length > 0 && players.every((p) => p.hasSubmitted);

  return {
    roomCode: room.roomCode,
    gridSize: room.gridSize,
    maxNumber: room.gridSize * room.gridSize,
    playerLimit: room.playerLimit,
    currentCount: room.players.length,
    currentPlayers: room.players.length,
    winningWord: room.winningWord,
    callingMode: room.callingMode,
    hostParticipates: room.hostParticipates,
    status: room.status,
    allSubmitted,
    turnOrder: room.turnOrder || [],
    game: formatPublicGameState(room.game),
    host: {
      playerId: room.hostPlayerId,
      name: hostName,
    },
    players: publicPlayers,
    createdAt: room.createdAt ? room.createdAt.toISOString() : new Date().toISOString(),
  };
}

export const roomService = {
  /**
   * Create a new room with host player in MongoDB.
   */
  async createRoom(
    input: CreateRoomInput
  ): Promise<
    ServiceResult<{
      roomCode: string;
      playerId: string;
      isHost: boolean;
      room: PublicRoom;
    }>
  > {
    // 1. Generate unique room code and host player ID
    const roomCode = await generateUniqueRoomCode();
    const hostPlayerId = generatePlayerId();

    // 2. Create host player document
    const hostPlayer = await PlayerModel.create({
      playerId: hostPlayerId,
      name: input.hostName,
      roomCode,
      isHost: true,
      isConnected: true,
      hasSubmitted: false,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 3. Create room document
    const room = await RoomModel.create({
      roomCode,
      hostPlayerId,
      gridSize: input.gridSize,
      playerLimit: input.playerLimit,
      winningWord: input.winningWord,
      callingMode: input.callingMode,
      hostParticipates: input.hostParticipates !== false,
      players: [hostPlayerId],
      status: 'waiting',
    });

    const publicRoom = formatPublicRoom(room, [hostPlayer], hostPlayer);

    return {
      success: true,
      statusCode: 201,
      message: 'Room created successfully',
      data: {
        roomCode,
        playerId: hostPlayerId,
        isHost: true,
        room: publicRoom,
      },
    };
  },

  /**
   * Join an existing room.
   */
  async joinRoom(
    roomCode: string,
    playerName: string
  ): Promise<
    ServiceResult<{
      roomCode: string;
      playerId: string;
      isHost: boolean;
      room: PublicRoom;
    }>
  > {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = playerName.trim();

    // 1. Find room
    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return {
        success: false,
        statusCode: 404,
        message: `Room "${cleanCode}" not found.`,
      };
    }

    // 2. Check room status
    if (room.status === 'playing' || room.game?.status === 'active') {
      return {
        success: false,
        statusCode: 409,
        message: 'Game already started. You cannot join this room.',
      };
    }

    if (room.status === 'finished') {
      return {
        success: false,
        statusCode: 409,
        message: 'This room match is already completed/closed.',
      };
    }

    // 3. Check capacity
    if (room.players.length >= room.playerLimit) {
      return {
        success: false,
        statusCode: 409,
        message: `Room is full (${room.players.length}/${room.playerLimit} players maximum).`,
      };
    }

    // 4. Check duplicate active player name in room
    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicatePlayer = await PlayerModel.findOne({
      roomCode: cleanCode,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      isConnected: true,
    });

    if (duplicatePlayer) {
      return {
        success: false,
        statusCode: 409,
        message: 'That player name is already being used in this room.',
      };
    }

    // 5. Generate player ID and create player document
    const playerId = generatePlayerId();
    const newPlayer = await PlayerModel.create({
      playerId,
      name: cleanName,
      roomCode: cleanCode,
      isHost: false,
      isConnected: true,
      hasSubmitted: false,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 6. Add player to room and update status if capacity reached
    room.players.push(playerId);
    if (room.players.length >= room.playerLimit) {
      room.status = 'ready';
    }
    await room.save();

    // 7. Fetch all active players for formatted response
    const allPlayers = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    const hostPlayer = allPlayers.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, allPlayers, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: `Joined room ${cleanCode} successfully`,
      data: {
        roomCode: cleanCode,
        playerId,
        isHost: false,
        room: publicRoom,
      },
    };
  },

  /**
   * Retrieve safe public room details.
   */
  async getRoom(roomCode: string): Promise<ServiceResult<PublicRoom>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return {
        success: false,
        statusCode: 404,
        message: `Room "${cleanCode}" not found.`,
      };
    }

    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Room details retrieved',
      data: publicRoom,
    };
  },

  /**
   * Player leaves room.
   */
  async leaveRoom(
    roomCode: string,
    playerId: string
  ): Promise<ServiceResult<{ roomCode: string; status: string }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return {
        success: false,
        statusCode: 404,
        message: `Room "${cleanCode}" not found.`,
      };
    }

    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId });
    if (!player) {
      return {
        success: false,
        statusCode: 404,
        message: 'Player not found in this room.',
      };
    }

    // Host leaving waiting room behavior:
    if (player.isHost && (room.status === 'waiting' || room.status === 'ready')) {
      room.status = 'finished';
      player.isConnected = false;
      await Promise.all([room.save(), player.save()]);

      return {
        success: true,
        statusCode: 200,
        message: 'Host left the room. Room has been marked closed.',
        data: { roomCode: cleanCode, status: room.status },
      };
    }

    // Regular player leaving:
    room.players = room.players.filter((id) => id !== playerId);
    if (room.status === 'ready' && room.players.length < room.playerLimit) {
      room.status = 'waiting';
    }
    player.isConnected = false;

    await Promise.all([room.save(), player.save()]);

    return {
      success: true,
      statusCode: 200,
      message: 'Player left room successfully.',
      data: { roomCode: cleanCode, status: room.status },
    };
  },

  /**
   * Update a player's connection status (online / offline) and heartbeat.
   */
  async setPlayerConnectionStatus(
    roomCode: string,
    playerId: string,
    isConnected: boolean
  ): Promise<ServiceResult<PublicRoom>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return {
        success: false,
        statusCode: 404,
        message: `Room "${cleanCode}" not found.`,
      };
    }

    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId });
    if (!player) {
      return {
        success: false,
        statusCode: 404,
        message: 'Player not found in this room.',
      };
    }

    player.isConnected = isConnected;
    player.lastSeenAt = new Date();
    await player.save();

    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: `Connection status updated to ${isConnected ? 'online' : 'offline'}`,
      data: publicRoom,
    };
  },

  /**
   * Submit and lock a player's Bingo board arrangement.
   */
  async submitPlayerBoard(
    roomCode: string,
    playerId: string,
    cells: unknown
  ): Promise<ServiceResult<{ room: PublicRoom; board: number[] }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    // 1. Authoritative room lookup
    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    if (room.status === 'finished') {
      return { success: false, statusCode: 409, message: 'This room match is already closed.' };
    }

    // 2. Authoritative player lookup
    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId });
    if (!player || !room.players.includes(playerId)) {
      return { success: false, statusCode: 404, message: 'Player not found in this room.' };
    }

    // 3. Check if already submitted (Board locking & Anti-cheating)
    if (player.hasSubmitted) {
      return {
        success: false,
        statusCode: 409,
        message: 'Board has already been submitted and locked.',
      };
    }

    // 4. Validate board against room's actual gridSize (server authoritative)
    const validation = validatePlayerBoard(cells, room.gridSize);
    if (!validation.isValid) {
      return {
        success: false,
        statusCode: 400,
        message: validation.error || 'Invalid board arrangement.',
      };
    }

    const validCells = cells as number[];

    // 5. Save board and lock player
    player.board = validCells;
    player.hasSubmitted = true;
    player.submittedAt = new Date();
    await player.save();

    // 6. Fetch all players in room
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    // 7. Check if all players submitted
    const allSubmitted = players.length > 0 && players.every((p) => p.hasSubmitted);
    if (allSubmitted && room.status === 'waiting') {
      room.status = 'ready';
      await room.save();
    }

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Board submitted and locked successfully.',
      data: {
        room: publicRoom,
        board: validCells,
      },
    };
  },

  /**
   * Retrieve a player's saved board.
   */
  async getPlayerBoard(
    roomCode: string,
    playerId: string
  ): Promise<ServiceResult<{ board: number[]; isSubmitted: boolean }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId });
    if (!player || !room.players.includes(playerId)) {
      return { success: false, statusCode: 404, message: 'Player not found in this room.' };
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Board retrieved successfully',
      data: {
        board: player.board || [],
        isSubmitted: player.hasSubmitted,
      },
    };
  },

  /**
   * Update the turn order of players for a room (Host only).
   */
  async updateTurnOrder(
    roomCode: string,
    requesterPlayerId: string,
    playerOrder: unknown
  ): Promise<ServiceResult<PublicRoom>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    // 1. Host permission check
    if (room.hostPlayerId !== requesterPlayerId) {
      return {
        success: false,
        statusCode: 403,
        message: 'Only the host can modify turn order.',
      };
    }

    // 2. Active game check
    if (room.status === 'playing' || room.game?.status === 'active') {
      return {
        success: false,
        statusCode: 409,
        message: 'Turn order cannot be modified after the game has started.',
      };
    }

    // 3. Validate turn order array against current room players
    const validation = validateTurnOrderInput(playerOrder, room.players);
    if (!validation.isValid || !validation.cleanOrder) {
      return {
        success: false,
        statusCode: 400,
        message: validation.error || 'Turn order is invalid. Every participating player must appear exactly once.',
      };
    }

    // 4. Validate all participating players have submitted their boards
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    });

    const unsubmitted = players.filter((p) => !p.hasSubmitted);
    if (unsubmitted.length > 0) {
      return {
        success: false,
        statusCode: 400,
        message: 'All players must submit their boards before configuring final turn order.',
      };
    }

    // 5. Update room turnOrder
    room.turnOrder = validation.cleanOrder;
    if (room.game) {
      room.game.playerOrder = validation.cleanOrder;
    }
    await room.save();

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Turn order updated successfully',
      data: publicRoom,
    };
  },

  /**
   * Authoritatively starts the Bingo Arena game (Host only).
   * Freezes participants, initializes game state, sets first turn.
   */
  async startGame(
    roomCode: string,
    requesterPlayerId: string,
    customOrder?: unknown
  ): Promise<ServiceResult<{ room: PublicRoom; game: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    // 1. Host permission check
    if (room.hostPlayerId !== requesterPlayerId) {
      return {
        success: false,
        statusCode: 403,
        message: 'Only the host can start the game.',
      };
    }

    // 2. Already started check
    if (room.status === 'playing' || room.game?.status === 'active') {
      return {
        success: false,
        statusCode: 409,
        message: 'Game has already started.',
      };
    }

    if (room.status === 'finished') {
      return {
        success: false,
        statusCode: 409,
        message: 'This room match is already closed.',
      };
    }

    // 3. Fetch all participating players
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    if (players.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: 'No players in room to start game.',
      };
    }

    // 4. Validate that all participating players have submitted valid boards
    const unsubmitted = players.filter((p) => !p.hasSubmitted);
    if (unsubmitted.length > 0) {
      const names = unsubmitted.map((p) => p.name).join(', ');
      return {
        success: false,
        statusCode: 400,
        message: `All players must submit their boards first. Waiting for: ${names}`,
      };
    }

    // 5. Determine final turn order
    let finalOrder: string[] = [];

    // If customOrder was provided in the start request, validate it
    if (customOrder && Array.isArray(customOrder)) {
      const customVal = validateTurnOrderInput(customOrder, room.players);
      if (!customVal.isValid || !customVal.cleanOrder) {
        return {
          success: false,
          statusCode: 400,
          message: customVal.error || 'Invalid turn order provided.',
        };
      }
      finalOrder = customVal.cleanOrder;
    } else if (room.turnOrder && room.turnOrder.length === room.players.length) {
      // Validate saved room.turnOrder
      const savedVal = validateTurnOrderInput(room.turnOrder, room.players);
      if (savedVal.isValid && savedVal.cleanOrder) {
        finalOrder = savedVal.cleanOrder;
      }
    }

    // Fallback: Default order if no valid custom order was set (Host first, then others)
    if (finalOrder.length === 0) {
      const hostInRoom = players.find((p) => p.playerId === room.hostPlayerId);
      const otherPlayers = players.filter((p) => p.playerId !== room.hostPlayerId);
      if (hostInRoom) {
        finalOrder = [hostInRoom.playerId, ...otherPlayers.map((p) => p.playerId)];
      } else {
        finalOrder = players.map((p) => p.playerId);
      }
    }

    // 6. Freeze participating players
    const frozenGamePlayers = [...finalOrder];

    // 7. Initialize authoritative game state (Turn starts on first player, no number called yet)
    room.game = {
      status: 'active',
      startedAt: new Date(),
      playerOrder: finalOrder,
      currentTurnIndex: 0,
      currentPlayerId: finalOrder[0],
      currentNumber: null,
      currentCallerName: null,
      turnNumber: 1,
      calledNumbers: [],
      callHistory: [],
      lastCalledNumbers: [],
      winnerId: null,
      winningWord: room.winningWord,
      completedLetters: 0,
      gamePlayers: frozenGamePlayers,
    };

    room.status = 'playing';
    room.turnOrder = finalOrder;
    await room.save();

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Game started successfully.',
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },

  /**
   * Turn Progression Foundation Helper:
   * Advances the turn to the next player in the frozen rotation order.
   * Increments turnNumber, sets currentPlayerId, saves to MongoDB.
   */
  async advanceTurn(
    roomCode: string,
    requesterPlayerId?: string
  ): Promise<ServiceResult<{ room: PublicRoom; game: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    if (room.status !== 'playing' || room.game?.status !== 'active') {
      return {
        success: false,
        statusCode: 400,
        message: 'Game is not active.',
      };
    }

    // If requester is provided, verify it is their turn
    if (requesterPlayerId && requesterPlayerId !== room.game.currentPlayerId) {
      return {
        success: false,
        statusCode: 403,
        message: 'Not your turn.',
      };
    }

    const order = room.game.playerOrder;
    if (!order || order.length === 0) {
      return {
        success: false,
        statusCode: 500,
        message: 'Invalid player order in active game.',
      };
    }

    // Increment turn index (circular rotation)
    const nextIndex = (room.game.currentTurnIndex + 1) % order.length;
    room.game.currentTurnIndex = nextIndex;
    room.game.currentPlayerId = order[nextIndex];
    room.game.turnNumber += 1;
    await room.save();

    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Turn advanced successfully.',
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },

  /**
   * Authoritatively calls a number in an active Bingo game.
   * Atomic concurrency protection, validation, history logging, and turn advancement.
   */
  async callNumber(
    roomCode: string,
    requesterPlayerId: string,
    rawNumber: unknown
  ): Promise<
    ServiceResult<{
      room: PublicRoom;
      game: PublicGameState;
      calledNumber: number;
      callRecord: {
        number: number;
        playerId: string;
        playerName: string;
        calledAt: string;
      };
    }>
  > {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPlayerId = requesterPlayerId.trim();

    // 1. Validate number input
    const num = Number(rawNumber);
    if (!Number.isInteger(num)) {
      return { success: false, statusCode: 400, message: 'Invalid number. Must be an integer.' };
    }

    // 2. Room lookup
    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: 'Game not found.' };
    }

    // 3. Active game checks
    if (!room.game) {
      return { success: false, statusCode: 400, message: 'Game has not started.' };
    }

    if (room.game.status === 'won' || room.game.status === 'ended') {
      return { success: false, statusCode: 400, message: 'Game has already ended.' };
    }

    if (room.game.status !== 'active') {
      return { success: false, statusCode: 400, message: 'Game has not started.' };
    }

    // 4. Participant verification
    const isParticipant =
      room.players.includes(cleanPlayerId) &&
      Array.isArray(room.game.gamePlayers) &&
      room.game.gamePlayers.includes(cleanPlayerId);

    if (!isParticipant) {
      return {
        success: false,
        statusCode: 403,
        message: 'You are not a participant in this active game.',
      };
    }

    // 5. Current player turn check
    if (room.game.currentPlayerId !== cleanPlayerId) {
      return {
        success: false,
        statusCode: 403,
        message: 'It is not your turn.',
      };
    }

    // 6. Number range validation (1 to N^2)
    const maxNumber = room.gridSize * room.gridSize;
    if (num < 1 || num > maxNumber) {
      return {
        success: false,
        statusCode: 400,
        message: `Number must be between 1 and ${maxNumber}.`,
      };
    }

    // 7. Uniqueness validation (check already called numbers)
    if (room.game.calledNumbers.includes(num)) {
      return {
        success: false,
        statusCode: 400,
        message: 'That number has already been called.',
      };
    }

    // 8. Caller metadata lookup
    const caller = await PlayerModel.findOne({ roomCode: cleanCode, playerId: cleanPlayerId });
    const callerName = caller ? caller.name : 'Contender';

    const now = new Date();
    const callRecord = {
      number: num,
      playerId: cleanPlayerId,
      playerName: callerName,
      calledAt: now,
    };

    // 9. Turn progression calculation
    const frozenOrder =
      room.game.playerOrder && room.game.playerOrder.length > 0
        ? room.game.playerOrder
        : room.game.gamePlayers;

    const nextIndex = (room.game.currentTurnIndex + 1) % frozenOrder.length;
    const nextPlayerId = frozenOrder[nextIndex];
    const nextTurnNumber = (room.game.turnNumber || 1) + 1;

    // 10. Compute updated last 5 calls (newest first)
    const existingLastCalls = Array.isArray(room.game.lastCalledNumbers)
      ? room.game.lastCalledNumbers
      : [];
    const updatedLastCalls = [callRecord, ...existingLastCalls].slice(0, 5);

    // 11. Atomic update to guarantee concurrency protection & prevent duplicate calls
    const updatedRoom = await RoomModel.findOneAndUpdate(
      {
        roomCode: cleanCode,
        'game.status': 'active',
        'game.currentPlayerId': cleanPlayerId,
        'game.calledNumbers': { $ne: num },
      },
      {
        $push: {
          'game.calledNumbers': num,
          'game.callHistory': callRecord,
        },
        $set: {
          'game.currentNumber': num,
          'game.currentCallerName': callerName,
          'game.currentTurnIndex': nextIndex,
          'game.currentPlayerId': nextPlayerId,
          'game.turnNumber': nextTurnNumber,
          'game.lastCalledNumbers': updatedLastCalls,
        },
      },
      { new: true }
    );

    if (!updatedRoom) {
      // Re-query to determine reason for rejection
      const freshRoom = await RoomModel.findOne({ roomCode: cleanCode });
      if (!freshRoom || !freshRoom.game) {
        return { success: false, statusCode: 404, message: 'Game not found.' };
      }
      if (freshRoom.game.status !== 'active') {
        return { success: false, statusCode: 400, message: 'Game has already ended.' };
      }
      if (freshRoom.game.calledNumbers.includes(num)) {
        return { success: false, statusCode: 400, message: 'That number has already been called.' };
      }
      if (freshRoom.game.currentPlayerId !== cleanPlayerId) {
        return { success: false, statusCode: 403, message: 'It is not your turn.' };
      }
      return { success: false, statusCode: 409, message: 'Concurrent call conflict. Please retry.' };
    }

    // 12. Fetch all players and format public DTOs
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: updatedRoom.players },
    }).sort({ joinedAt: 1 });

    const hostPlayer = players.find((p) => p.playerId === updatedRoom.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(updatedRoom, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Number called successfully.',
      data: {
        room: publicRoom,
        game: publicRoom.game,
        calledNumber: num,
        callRecord: {
          number: num,
          playerId: cleanPlayerId,
          playerName: callerName,
          calledAt: now.toISOString(),
        },
      },
    };
  },

  /**
   * Random Calling Engine Foundation:
   * Selects an unused number from 1..N^2 without repeats.
   */
  async callRandomNumber(
    roomCode: string
  ): Promise<
    ServiceResult<{
      room: PublicRoom;
      game: PublicGameState;
      calledNumber: number;
      callRecord: {
        number: number;
        playerId: string;
        playerName: string;
        calledAt: string;
      };
    }>
  > {
    const cleanCode = roomCode.trim().toUpperCase();
    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room || !room.game || room.game.status !== 'active') {
      return { success: false, statusCode: 400, message: 'Game is not active.' };
    }

    const maxNumber = room.gridSize * room.gridSize;
    const calledSet = new Set(room.game.calledNumbers || []);
    const availableNumbers: number[] = [];

    for (let i = 1; i <= maxNumber; i++) {
      if (!calledSet.has(i)) {
        availableNumbers.push(i);
      }
    }

    if (availableNumbers.length === 0) {
      return { success: false, statusCode: 400, message: 'All numbers have already been called.' };
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const pickedNumber = availableNumbers[randomIndex];
    const callerId = room.game.currentPlayerId || room.hostPlayerId;

    return this.callNumber(cleanCode, callerId, pickedNumber);
  },
};
