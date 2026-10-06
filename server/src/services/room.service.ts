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
      turnNumber: 0,
      calledNumbers: [],
      lastCalledNumbers: [],
      winnerId: null,
      winningWord: '',
      completedLetters: 0,
      gamePlayers: [],
    };
  }

  return {
    status: game.status || 'waiting',
    startedAt: game.startedAt ? game.startedAt.toISOString() : null,
    playerOrder: game.playerOrder || [],
    currentTurnIndex: game.currentTurnIndex || 0,
    currentPlayerId: game.currentPlayerId || null,
    turnNumber: game.turnNumber || 0,
    calledNumbers: game.calledNumbers || [],
    lastCalledNumbers: game.lastCalledNumbers || [],
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
};
