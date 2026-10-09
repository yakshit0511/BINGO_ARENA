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
  CallNumberResultData,
} from '../types';
import { generateUniqueRoomCode, generatePlayerId } from '../utils/roomCode';
import { validatePlayerBoard, validateTurnOrderInput } from '../utils/validation';
import { bingoService, PlayerLineEvaluation } from './bingo.service';

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
      endedAt: null,
      roundNumber: 1,
      roundHistory: [],
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
      winnerName: null,
      winningNumber: null,
      wonAt: null,
      winningWord: '',
      completedLetters: 0,
      winningLines: [],
      winnerProgress: 0,
      gamePlayers: [],
    };
  }

  const formatRecord = (r: unknown) => {
    const rec = r as { number: number; playerId?: string; playerName?: string; calledAt?: Date | string };
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

  const formatRound = (rh: unknown) => {
    const r = rh as {
      roundNumber?: number;
      winnerId?: string | null;
      winnerName?: string | null;
      winningNumber?: number | null;
      winningWord?: string;
      totalCalls?: number;
      startedAt?: Date | string;
      endedAt?: Date | string;
      noWinner?: boolean;
      playerProgress?: {
        playerId: string;
        playerName: string;
        earnedLetters?: string[];
        completedLines?: string[];
        completedLineCount?: number;
      }[];
      callHistory?: unknown[];
    };
    if (!r) {
      return {
        roundNumber: 1,
        winnerId: null,
        winnerName: null,
        winningNumber: null,
        winningWord: '',
        totalCalls: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        noWinner: false,
        playerProgress: [],
        callHistory: [],
      };
    }
    return {
      roundNumber: r.roundNumber || 1,
      winnerId: r.winnerId || null,
      winnerName: r.winnerName || null,
      winningNumber: r.winningNumber ?? null,
      winningWord: r.winningWord || '',
      totalCalls: r.totalCalls || 0,
      startedAt: r.startedAt ? (r.startedAt instanceof Date ? r.startedAt.toISOString() : String(r.startedAt)) : new Date().toISOString(),
      endedAt: r.endedAt ? (r.endedAt instanceof Date ? r.endedAt.toISOString() : String(r.endedAt)) : new Date().toISOString(),
      noWinner: Boolean(r.noWinner),
      playerProgress: Array.isArray(r.playerProgress)
        ? r.playerProgress.map((pp) => ({
            playerId: pp.playerId,
            playerName: pp.playerName,
            earnedLetters: Array.isArray(pp.earnedLetters) ? pp.earnedLetters : [],
            completedLines: Array.isArray(pp.completedLines) ? pp.completedLines : [],
            completedLineCount: pp.completedLineCount || 0,
          }))
        : [],
      callHistory: Array.isArray(r.callHistory) ? r.callHistory.map(formatRecord) : [],
    };
  };

  return {
    status: game.status || 'waiting',
    startedAt: game.startedAt ? (game.startedAt instanceof Date ? game.startedAt.toISOString() : String(game.startedAt)) : null,
    endedAt: game.endedAt ? (game.endedAt instanceof Date ? game.endedAt.toISOString() : String(game.endedAt)) : null,
    roundNumber: game.roundNumber || 1,
    roundHistory: Array.isArray(game.roundHistory) ? game.roundHistory.map(formatRound) : [],
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
    winnerName: game.winnerName || null,
    loserId: game.loserId || null,
    loserName: game.loserName || null,
    rankings: Array.isArray(game.rankings)
      ? game.rankings.map((rk: any) => ({
          playerId: String(rk.playerId),
          playerName: String(rk.playerName),
          rank: Number(rk.rank),
          finishedAt: rk.finishedAt
            ? rk.finishedAt instanceof Date
              ? rk.finishedAt.toISOString()
              : String(rk.finishedAt)
            : new Date().toISOString(),
        }))
      : [],
    finishedPlayerIds: Array.isArray(game.finishedPlayerIds) ? game.finishedPlayerIds : [],
    winningNumber: game.winningNumber ?? null,
    wonAt: game.wonAt ? (game.wonAt instanceof Date ? game.wonAt.toISOString() : String(game.wonAt)) : null,
    winningWord: game.winningWord || '',
    completedLetters: game.completedLetters || 0,
    winningLines: Array.isArray(game.winningLines) ? game.winningLines : [],
    winnerProgress: game.winnerProgress ?? (game.completedLetters || 0),
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
    joinedAt: p.joinedAt ? (p.joinedAt instanceof Date ? p.joinedAt.toISOString() : String(p.joinedAt)) : new Date().toISOString(),
    completedLines: p.completedLines || [],
    earnedLetters: p.earnedLetters || [],
    completedLineCount: p.completedLineCount || 0,
    board: p.board,
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
    markingMode: room.markingMode || 'auto',
    status: room.status,
    allSubmitted,
    turnOrder: room.turnOrder || [],
    game: formatPublicGameState(room.game),
    host: {
      playerId: room.hostPlayerId,
      name: hostName,
    },
    players: publicPlayers,
    createdAt: room.createdAt ? (room.createdAt instanceof Date ? room.createdAt.toISOString() : String(room.createdAt)) : new Date().toISOString(),
  };
}

// High-performance in-memory room cache to eliminate database pressure under concurrent players
const activeRoomCache = new Map<string, { room: PublicRoom; cachedAt: number }>();
const CACHE_TTL_MS = 2500; // 2.5 seconds TTL for reads, invalidated immediately on any write

export function setCachedRoom(roomCode: string, room: PublicRoom): void {
  activeRoomCache.set(roomCode.trim().toUpperCase(), { room, cachedAt: Date.now() });
}

export function getCachedRoom(roomCode: string): PublicRoom | null {
  const item = activeRoomCache.get(roomCode.trim().toUpperCase());
  if (!item) return null;
  if (Date.now() - item.cachedAt > CACHE_TTL_MS) {
    activeRoomCache.delete(roomCode.trim().toUpperCase());
    return null;
  }
  return item.room;
}

export function invalidateRoomCache(roomCode: string): void {
  activeRoomCache.delete(roomCode.trim().toUpperCase());
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
      markingMode: input.markingMode || 'auto',
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
    if (room.status === 'closed') {
      return {
        success: false,
        statusCode: 403,
        message: 'The room has already been closed.',
      };
    }

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

    // 1. Instant in-memory cache hit
    const cached = getCachedRoom(cleanCode);
    if (cached) {
      return {
        success: true,
        statusCode: 200,
        message: 'Room details retrieved',
        data: cached,
      };
    }

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
    setCachedRoom(cleanCode, publicRoom);

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
   * Host kicks/removes a player from the room.
   */
  async kickPlayer(
    roomCode: string,
    hostPlayerId: string,
    targetPlayerId: string
  ): Promise<ServiceResult<{ room: PublicRoom; kickedPlayerId: string; kickedPlayerName: string }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    if (room.hostPlayerId !== hostPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can remove players.' };
    }

    if (targetPlayerId === room.hostPlayerId) {
      return { success: false, statusCode: 400, message: 'Host cannot be removed from the room.' };
    }

    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId: targetPlayerId });
    const playerName = player?.name || 'Player';

    // Remove from room's players list and turnOrder
    room.players = room.players.filter((id) => id !== targetPlayerId);
    if (room.turnOrder) {
      room.turnOrder = room.turnOrder.filter((id) => id !== targetPlayerId);
    }

    // Delete player from database
    if (player) {
      await PlayerModel.deleteOne({ roomCode: cleanCode, playerId: targetPlayerId });
    }

    // Fetch remaining players
    const remainingPlayers = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    // Update active match state if game is running or ready
    if (room.game && (room.game.status === 'active' || room.game.status === 'ready')) {
      if (Array.isArray(room.game.gamePlayers)) {
        room.game.gamePlayers = room.game.gamePlayers.filter((id) => id !== targetPlayerId);
      }
      if (Array.isArray(room.game.playerOrder)) {
        room.game.playerOrder = room.game.playerOrder.filter((id) => id !== targetPlayerId);
      }
      if (Array.isArray(room.game.finishedPlayerIds)) {
        room.game.finishedPlayerIds = room.game.finishedPlayerIds.filter((id) => id !== targetPlayerId);
      }

      // If it was the kicked player's turn, advance turn immediately to next active player
      if (room.game.currentPlayerId === targetPlayerId && room.game.playerOrder.length > 0) {
        const nextIdx = (room.game.currentTurnIndex || 0) % room.game.playerOrder.length;
        room.game.currentTurnIndex = nextIdx;
        room.game.currentPlayerId = room.game.playerOrder[nextIdx];
        const nextPlayerDoc = remainingPlayers.find((p) => p.playerId === room.game.currentPlayerId);
        room.game.currentCallerName = nextPlayerDoc ? nextPlayerDoc.name : 'Active Player';
      }

      // If only 1 player remains in an active game, declare them the winner!
      if (room.game.status === 'active' && room.game.playerOrder.length <= 1) {
        const soleWinner = remainingPlayers.find((p) => p.playerId === room.game.playerOrder[0]);
        room.game.status = 'won';
        room.game.winnerId = room.game.playerOrder[0] || null;
        room.game.winnerName = soleWinner ? soleWinner.name : 'Sole Contender';
        room.game.wonAt = new Date();
        room.status = 'finished';
      }
    }

    // Re-evaluate if all submitted for pre-game waiting rooms
    const allSubmitted = remainingPlayers.length > 0 && remainingPlayers.every((p) => p.hasSubmitted);
    if (allSubmitted && room.status === 'waiting') {
      room.status = 'ready';
    } else if (!allSubmitted && room.status === 'ready') {
      room.status = 'waiting';
    }
    await room.save();

    const hostPlayer = remainingPlayers.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, remainingPlayers, hostPlayer);
    setCachedRoom(cleanCode, publicRoom);

    return {
      success: true,
      statusCode: 200,
      message: `${playerName} has been removed by the host.`,
      data: {
        room: publicRoom,
        kickedPlayerId: targetPlayerId,
        kickedPlayerName: playerName,
      },
    };
  },

  /**
   * Host updates room marking mode ('auto' | 'manual').
   */
  async updateMarkingMode(
    roomCode: string,
    hostPlayerId: string,
    markingMode: 'auto' | 'manual'
  ): Promise<ServiceResult<{ room: PublicRoom }>> {
    const cleanCode = roomCode.trim().toUpperCase();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: `Room "${cleanCode}" not found.` };
    }

    if (room.hostPlayerId !== hostPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can change room settings.' };
    }

    room.markingMode = markingMode === 'manual' ? 'manual' : 'auto';
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
      message: `Marking mode updated to ${room.markingMode}`,
      data: { room: publicRoom },
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

    if (room.status === 'closed') {
      return { success: false, statusCode: 403, message: 'The room has already been closed.' };
    }

    if (room.status === 'finished') {
      return { success: false, statusCode: 409, message: 'This room match is already closed.' };
    }

    // 2. Authoritative player lookup
    const player = await PlayerModel.findOne({ roomCode: cleanCode, playerId });
    if (!player || !room.players.includes(playerId)) {
      return { success: false, statusCode: 404, message: 'Player not found in this room.' };
    }

    // 3. Check if already submitted (Idempotent handling for fast retries / parallel requests)
    if (player.hasSubmitted) {
      const players = await PlayerModel.find({
        roomCode: cleanCode,
        playerId: { $in: room.players },
      }).sort({ joinedAt: 1 });
      const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
      const publicRoom = formatPublicRoom(room, players, hostPlayer);
      return {
        success: true,
        statusCode: 200,
        message: 'Board already submitted and locked.',
        data: {
          room: publicRoom,
          board: (player.board && player.board.length > 0) ? player.board : (Array.isArray(cells) ? cells as number[] : []),
        },
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

    // 5. Save board and lock player atomically (prevents Mongoose VersionError on concurrent requests)
    const updatedPlayer = await PlayerModel.findOneAndUpdate(
      { roomCode: cleanCode, playerId, hasSubmitted: { $ne: true } },
      {
        $set: {
          board: validCells,
          hasSubmitted: true,
          submittedAt: new Date(),
        },
      },
      { new: true }
    );

    // 6. Fetch all players in room
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    // 7. Check if all players submitted
    const allSubmitted = players.length > 0 && players.every((p) => p.hasSubmitted);
    if (allSubmitted && room.status === 'waiting') {
      await RoomModel.updateOne(
        { roomCode: cleanCode, status: 'waiting' },
        { $set: { status: 'ready' } }
      );
      room.status = 'ready';
    }

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    const savedBoard = (updatedPlayer && updatedPlayer.board && updatedPlayer.board.length > 0)
      ? updatedPlayer.board
      : validCells;

    return {
      success: true,
      statusCode: 200,
      message: 'Board submitted and locked successfully.',
      data: {
        room: publicRoom,
        board: savedBoard,
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

    if (room.status === 'closed') {
      return {
        success: false,
        statusCode: 403,
        message: 'The room has already been closed.',
      };
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

    // 2. Already started or closed check
    if (room.status === 'closed') {
      return {
        success: false,
        statusCode: 403,
        message: 'The room has already been closed.',
      };
    }

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

    // If customOrder was provided and non-empty in the start request, validate it
    if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
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
      endedAt: null,
      roundNumber: room.game?.roundNumber || 1,
      roundHistory: room.game?.roundHistory || [],
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
      winnerName: null,
      winningNumber: null,
      wonAt: null,
      winningWord: room.winningWord,
      completedLetters: 0,
      winningLines: [],
      winnerProgress: 0,
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
  ): Promise<ServiceResult<CallNumberResultData>> {
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
    if (room.status === 'closed') {
      return { success: false, statusCode: 403, message: 'The room has already been closed.' };
    }

    if (!room.game) {
      return { success: false, statusCode: 400, message: 'Game has not started.' };
    }

    if (room.game.status === 'won' || room.game.status === 'ended' || room.game.status === 'no_winner') {
      return { success: false, statusCode: 400, message: 'Game has already ended.' };
    }

    if (room.game.status !== 'active') {
      return { success: false, statusCode: 400, message: 'Game is not active.' };
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
    if (String(room.game.currentPlayerId || '').trim() !== cleanPlayerId) {
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

    // 9. Turn progression calculation order
    const frozenOrder =
      room.game.playerOrder && room.game.playerOrder.length > 0
        ? room.game.playerOrder
        : room.game.gamePlayers;

    // 10. Compute updated last 5 calls (newest first)
    const existingLastCalls = Array.isArray(room.game.lastCalledNumbers)
      ? room.game.lastCalledNumbers
      : [];
    const updatedLastCalls = [callRecord, ...existingLastCalls].slice(0, 5);

    // 11. Atomic update to record global number call and prevent duplicate / concurrent calls
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
      if (freshRoom.status === 'closed') {
        return { success: false, statusCode: 403, message: 'The room has already been closed.' };
      }
      if (freshRoom.game.status === 'won' || freshRoom.game.status === 'ended' || freshRoom.game.status === 'no_winner') {
        return { success: false, statusCode: 400, message: 'Game has already ended or been won.' };
      }
      if (freshRoom.game.status !== 'active') {
        return { success: false, statusCode: 400, message: 'Game is not active.' };
      }
      if (freshRoom.game.calledNumbers.includes(num)) {
        return { success: false, statusCode: 400, message: 'That number has already been called.' };
      }
      if (String(freshRoom.game.currentPlayerId || '').trim() !== cleanPlayerId) {
        return { success: false, statusCode: 403, message: 'It is not your turn.' };
      }
      return { success: false, statusCode: 409, message: 'Concurrent call conflict. Please retry.' };
    }

    // 12. Fetch all participating players and their submitted boards
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: updatedRoom.players },
    }).sort({ joinedAt: 1 });

    // 13. AUTHORITATIVE BINGO EVALUATION ACROSS EVERY PLAYER
    const bingoResult = bingoService.evaluateAllPlayers(
      players,
      updatedRoom.gridSize,
      updatedRoom.game.calledNumbers,
      updatedRoom.game.winningWord,
      cleanPlayerId,
      frozenOrder
    );

    // 14. Persist updated completed lines & earned letters for each player in parallel via bulkWrite
    const bulkOps = [];
    for (const p of players) {
      const pEval = bingoResult.playerEvaluations.get(p.playerId);
      if (pEval) {
        p.completedLines = pEval.allCompletedLines;
        p.earnedLetters = pEval.earnedLetters;
        p.completedLineCount = pEval.completedLineCount;
        bulkOps.push({
          updateOne: {
            filter: { roomCode: cleanCode, playerId: p.playerId },
            update: {
              $set: {
                completedLines: pEval.allCompletedLines,
                earnedLetters: pEval.earnedLetters,
                completedLineCount: pEval.completedLineCount,
              },
            },
          },
        });
      }
    }
    if (bulkOps.length > 0) {
      await PlayerModel.bulkWrite(bulkOps, { ordered: false });
    }

    // 15. AUTHORITATIVE "ONLY ONE LOSER" EVALUATION ACROSS PLAYERS
    if (!Array.isArray(updatedRoom.game.rankings)) {
      updatedRoom.game.rankings = [];
    }
    if (!Array.isArray(updatedRoom.game.finishedPlayerIds)) {
      updatedRoom.game.finishedPlayerIds = [];
    }

    // Check newly finished players on this turn
    // Priority order: caller first, then turn order
    const priorityPids = [
      cleanPlayerId,
      ...frozenOrder.filter((id) => id !== cleanPlayerId),
    ];

    for (const pid of priorityPids) {
      const pEval = bingoResult.playerEvaluations.get(pid);
      if (pEval && pEval.hasWon && !updatedRoom.game.finishedPlayerIds.includes(pid)) {
        updatedRoom.game.finishedPlayerIds.push(pid);
        const rank = updatedRoom.game.rankings.length + 1;
        updatedRoom.game.rankings.push({
          playerId: pid,
          playerName: pEval.playerName,
          rank,
          finishedAt: now,
        });

        // First place winner
        if (rank === 1) {
          updatedRoom.game.winnerId = pid;
          updatedRoom.game.winnerName = pEval.playerName;
          updatedRoom.game.winningNumber = num;
          updatedRoom.game.wonAt = now;
          updatedRoom.game.completedLetters = updatedRoom.game.winningWord.length;
          updatedRoom.game.winningLines = pEval.allCompletedLines;
          updatedRoom.game.winnerProgress = pEval.completedLineCount;
        }
      }
    }

    const unfinishedPlayers = players.filter(
      (p) => !updatedRoom.game.finishedPlayerIds?.includes(p.playerId)
    );

    const maxNumbers = updatedRoom.gridSize * updatedRoom.gridSize;

    if (players.length <= 1) {
      // Solo / Edge case: Single player finishes or exhausts numbers
      if (updatedRoom.game.winnerId || updatedRoom.game.calledNumbers.length >= maxNumbers) {
        updatedRoom.game.status = updatedRoom.game.winnerId ? 'won' : 'no_winner';
        updatedRoom.game.endedAt = now;
        updatedRoom.status = 'finished';
        await updatedRoom.save();
      }
    } else if (unfinishedPlayers.length === 1) {
      // Exactly ONE player has not completed BINGO: That player is the ONLY LOSER!
      const loser = unfinishedPlayers[0];
      updatedRoom.game.loserId = loser.playerId;
      updatedRoom.game.loserName = loser.name;
      updatedRoom.game.status = 'won';
      updatedRoom.game.endedAt = now;
      updatedRoom.status = 'finished';
      await updatedRoom.save();
    } else if (unfinishedPlayers.length === 0) {
      // All players finished (e.g. simultaneous finish)
      const lastRanked = updatedRoom.game.rankings[updatedRoom.game.rankings.length - 1];
      if (lastRanked) {
        updatedRoom.game.loserId = lastRanked.playerId;
        updatedRoom.game.loserName = lastRanked.playerName;
      }
      updatedRoom.game.status = 'won';
      updatedRoom.game.endedAt = now;
      updatedRoom.status = 'finished';
      await updatedRoom.save();
    } else if (updatedRoom.game.calledNumbers.length >= maxNumbers) {
      // All numbers exhausted without finding a single loser through letter completions
      // The unfinished player with the least completed lines is the designated loser
      const sortedUnfinished = [...unfinishedPlayers].sort(
        (a, b) => (a.completedLineCount || 0) - (b.completedLineCount || 0)
      );
      if (sortedUnfinished.length > 0) {
        updatedRoom.game.loserId = sortedUnfinished[0].playerId;
        updatedRoom.game.loserName = sortedUnfinished[0].name;
      }
      updatedRoom.game.status = updatedRoom.game.winnerId ? 'won' : 'no_winner';
      updatedRoom.game.endedAt = now;
      updatedRoom.status = 'finished';
      await updatedRoom.save();
    } else {
      // MULTIPLE PLAYERS STILL UNFINISHED: Match continues!
      // Players who completed their letters wait. Advance turn to the next UNFINISHED player in rotation.
      let nextIndex = (updatedRoom.game.currentTurnIndex + 1) % frozenOrder.length;
      for (let i = 1; i <= frozenOrder.length; i++) {
        const candidateIdx = (updatedRoom.game.currentTurnIndex + i) % frozenOrder.length;
        const candidateId = frozenOrder[candidateIdx];
        if (!updatedRoom.game.finishedPlayerIds.includes(candidateId)) {
          nextIndex = candidateIdx;
          break;
        }
      }

      const nextPlayerId = frozenOrder[nextIndex];
      const nextTurnNumber = (updatedRoom.game.turnNumber || 1) + 1;

      updatedRoom.game.currentTurnIndex = nextIndex;
      updatedRoom.game.currentPlayerId = nextPlayerId;
      updatedRoom.game.turnNumber = nextTurnNumber;
      updatedRoom.game.status = 'active';
      updatedRoom.status = 'playing';
      await updatedRoom.save();
    }

    // 16. Format safe public DTOs
    const hostPlayer = players.find((p) => p.playerId === updatedRoom.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(updatedRoom, players, hostPlayer);

    const isMatchConcluded = updatedRoom.game.status === 'won' || updatedRoom.game.status === 'no_winner';

    return {
      success: true,
      statusCode: 200,
      message: isMatchConcluded
        ? `Match concluded! Winner: ${updatedRoom.game.winnerName || 'Champion'}${updatedRoom.game.loserName ? `, Loser: ${updatedRoom.game.loserName}` : ''}`
        : `Number ${num} called successfully.`,
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
        winner: bingoResult.winner
          ? {
              playerId: bingoResult.winner.playerId,
              playerName: bingoResult.winner.playerName,
              winningWord: updatedRoom.game.winningWord,
              winningNumber: num,
              wonAt: now.toISOString(),
              completedLines: bingoResult.winner.allCompletedLines,
              earnedLetters: bingoResult.winner.earnedLetters,
            }
          : null,
        playerEvaluations: Array.from(bingoResult.playerEvaluations.values()).map((pe) => ({
          playerId: pe.playerId,
          playerName: pe.playerName,
          allCompletedLines: pe.allCompletedLines,
          newlyCompletedLines: pe.newlyCompletedLines,
          earnedLetters: pe.earnedLetters,
          newlyEarnedLetters: pe.newlyEarnedLetters,
          completedLineCount: pe.completedLineCount,
          hasWon: pe.hasWon,
        })),
      },
    };
  },

  /**
   * Random Calling Engine Foundation:
   * Selects an unused number from 1..N^2 without repeats.
   */
  async callRandomNumber(
    roomCode: string
  ): Promise<ServiceResult<CallNumberResultData>> {
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

  /**
   * Host restarts a completed/won match without rebuilding the room.
   * Preserves room, players, submitted boards, winning word, and turn order.
   */
  /**
   * Host continues the match to a new round after a win.
   * Preserves room, players, submitted boards, winning word, and turn order.
   * Archives current round in roundHistory and starts Round N+1.
   */
  async continueGame(
    roomCode: string,
    requesterPlayerId: string
  ): Promise<ServiceResult<{ room: PublicRoom; game: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPlayerId = requesterPlayerId.trim();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: 'Game not found.' };
    }

    if (room.status === 'closed') {
      return { success: false, statusCode: 403, message: 'The room has already been closed.' };
    }

    if (room.hostPlayerId !== cleanPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can continue the game.' };
    }

    if (!room.game) {
      return { success: false, statusCode: 400, message: 'No game state found.' };
    }

    if (room.game.status === 'active') {
      return { success: false, statusCode: 400, message: 'The game is still active.' };
    }

    if (room.game.status !== 'won') {
      return { success: false, statusCode: 400, message: 'Can only continue when a round has been won.' };
    }

    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    // 1. Snapshot previous round into roundHistory
    const currentRoundRecord = {
      roundNumber: room.game.roundNumber || 1,
      winnerId: room.game.winnerId || null,
      winnerName: room.game.winnerName || null,
      winningNumber: room.game.winningNumber ?? null,
      winningWord: room.game.winningWord || room.winningWord,
      totalCalls: room.game.calledNumbers ? room.game.calledNumbers.length : 0,
      startedAt: room.game.startedAt || new Date(),
      endedAt: room.game.endedAt || room.game.wonAt || new Date(),
      noWinner: false,
      playerProgress: players.map((p) => ({
        playerId: p.playerId,
        playerName: p.name,
        earnedLetters: p.earnedLetters || [],
        completedLines: p.completedLines || [],
        completedLineCount: p.completedLineCount || 0,
      })),
      callHistory: room.game.callHistory || [],
    };

    // 2. Reset player boards & submission status in database so all players re-choose numbers
    await PlayerModel.updateMany(
      { roomCode: cleanCode },
      {
        $set: {
          hasSubmitted: false,
          board: [],
          completedLines: [],
          earnedLetters: [],
          completedLineCount: 0,
        },
      }
    );

    // Synchronize in-memory player instances
    for (const p of players) {
      p.hasSubmitted = false;
      p.board = [];
      p.completedLines = [];
      p.earnedLetters = [];
      p.completedLineCount = 0;
    }

    // 3. Reset game state to waiting for board setup, advance roundNumber
    const nextRoundNumber = (room.game.roundNumber || 1) + 1;
    const existingHistory = Array.isArray(room.game.roundHistory) ? room.game.roundHistory : [];

    room.game.roundHistory = [...existingHistory, currentRoundRecord];
    room.game.roundNumber = nextRoundNumber;
    room.game.status = 'waiting';
    room.game.startedAt = null;
    room.game.endedAt = null;
    room.game.turnNumber = 0;
    room.game.currentTurnIndex = 0;
    room.game.currentPlayerId = null;
    room.game.currentNumber = null;
    room.game.currentCallerName = null;
    room.game.calledNumbers = [];
    room.game.callHistory = [];
    room.game.lastCalledNumbers = [];
    room.game.winnerId = null;
    room.game.winnerName = null;
    room.game.loserId = null;
    room.game.loserName = null;
    room.game.rankings = [];
    room.game.finishedPlayerIds = [];
    room.game.winningNumber = null;
    room.game.wonAt = null;
    room.game.winningLines = [];
    room.game.winnerProgress = 0;
    room.game.completedLetters = 0;
    room.status = 'waiting';
    await room.save();

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: `Round ${nextRoundNumber} initialized. All players can now configure their boards.`,
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },

  /**
   * Host restarts a completed or no-winner match without rebuilding boards.
   * Preserves room, players, submitted boards, winning word, and turn order.
   * Archives current round in roundHistory and starts Round N+1.
   */
  async restartGame(
    roomCode: string,
    requesterPlayerId: string
  ): Promise<ServiceResult<{ room: PublicRoom; game: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPlayerId = requesterPlayerId.trim();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: 'Game not found.' };
    }

    if (room.status === 'closed') {
      return { success: false, statusCode: 403, message: 'The room has already been closed.' };
    }

    if (room.hostPlayerId !== cleanPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can restart the game.' };
    }

    if (!room.game) {
      return { success: false, statusCode: 400, message: 'No game state found.' };
    }

    if (room.game.status === 'active') {
      return {
        success: false,
        statusCode: 400,
        message: 'The game is still active.',
      };
    }

    if (room.game.status !== 'won' && room.game.status !== 'no_winner' && room.game.status !== 'ended') {
      return {
        success: false,
        statusCode: 400,
        message: 'Cannot restart game while match is active or waiting.',
      };
    }

    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    // 1. Snapshot previous round into roundHistory
    const currentRoundRecord = {
      roundNumber: room.game.roundNumber || 1,
      winnerId: room.game.winnerId || null,
      winnerName: room.game.winnerName || null,
      winningNumber: room.game.winningNumber ?? null,
      winningWord: room.game.winningWord || room.winningWord,
      totalCalls: room.game.calledNumbers ? room.game.calledNumbers.length : 0,
      startedAt: room.game.startedAt || new Date(),
      endedAt: room.game.endedAt || new Date(),
      noWinner: room.game.status === 'no_winner' || !room.game.winnerId,
      playerProgress: players.map((p) => ({
        playerId: p.playerId,
        playerName: p.name,
        earnedLetters: p.earnedLetters || [],
        completedLines: p.completedLines || [],
        completedLineCount: p.completedLineCount || 0,
      })),
      callHistory: room.game.callHistory || [],
    };

    // 2. Reset player progress and boards in database so players re-choose their numbers
    await PlayerModel.updateMany(
      { roomCode: cleanCode },
      {
        $set: {
          hasSubmitted: false,
          board: [],
          completedLines: [],
          earnedLetters: [],
          completedLineCount: 0,
        },
      }
    );

    // Synchronize in-memory player instances
    for (const p of players) {
      p.hasSubmitted = false;
      p.board = [];
      p.completedLines = [];
      p.earnedLetters = [];
      p.completedLineCount = 0;
    }

    // 3. Reset round-specific game state and advance roundNumber
    const nextRoundNumber = (room.game.roundNumber || 1) + 1;
    const existingHistory = Array.isArray(room.game.roundHistory) ? room.game.roundHistory : [];

    room.game.roundHistory = [...existingHistory, currentRoundRecord];
    room.game.roundNumber = nextRoundNumber;
    room.game.status = 'waiting';
    room.game.startedAt = null;
    room.game.endedAt = null;
    room.game.turnNumber = 0;
    room.game.currentTurnIndex = 0;
    room.game.currentPlayerId = null;
    room.game.currentNumber = null;
    room.game.currentCallerName = null;
    room.game.calledNumbers = [];
    room.game.callHistory = [];
    room.game.lastCalledNumbers = [];
    room.game.winnerId = null;
    room.game.winnerName = null;
    room.game.loserId = null;
    room.game.loserName = null;
    room.game.rankings = [];
    room.game.finishedPlayerIds = [];
    room.game.winningNumber = null;
    room.game.wonAt = null;
    room.game.winningLines = [];
    room.game.winnerProgress = 0;
    room.game.completedLetters = 0;
    room.status = 'waiting';
    await room.save();

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: `Round ${nextRoundNumber} initialized. All players can now configure their boards.`,
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },

  /**
   * Host ends the game explicitly and transitions match to ended / Results state.
   */
  async endGame(
    roomCode: string,
    requesterPlayerId: string
  ): Promise<ServiceResult<{ room: PublicRoom; game: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPlayerId = requesterPlayerId.trim();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: 'Game not found.' };
    }

    if (room.status === 'closed') {
      return { success: false, statusCode: 403, message: 'The room has already been closed.' };
    }

    if (room.hostPlayerId !== cleanPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can end the match.' };
    }

    const now = new Date();
    const players = await PlayerModel.find({
      roomCode: cleanCode,
      playerId: { $in: room.players },
    }).sort({ joinedAt: 1 });

    if (room.game) {
      const wasNoWinner = room.game.status === 'no_winner' || !room.game.winnerId;
      room.game.status = 'ended';
      room.game.endedAt = now;

      // Ensure round is recorded in roundHistory
      const existingHistory = Array.isArray(room.game.roundHistory) ? room.game.roundHistory : [];
      const currentRoundNum = room.game.roundNumber || 1;
      const alreadySaved = existingHistory.some((r) => r.roundNumber === currentRoundNum);
      if (!alreadySaved) {
        const finalRoundRecord = {
          roundNumber: currentRoundNum,
          winnerId: room.game.winnerId || null,
          winnerName: room.game.winnerName || null,
          winningNumber: room.game.winningNumber ?? null,
          winningWord: room.game.winningWord || room.winningWord,
          totalCalls: room.game.calledNumbers ? room.game.calledNumbers.length : 0,
          startedAt: room.game.startedAt || now,
          endedAt: now,
          noWinner: wasNoWinner,
          playerProgress: players.map((p) => ({
            playerId: p.playerId,
            playerName: p.name,
            earnedLetters: p.earnedLetters || [],
            completedLines: p.completedLines || [],
            completedLineCount: p.completedLineCount || 0,
          })),
          callHistory: room.game.callHistory || [],
        };
        room.game.roundHistory = [...existingHistory, finalRoundRecord];
      }
    }
    room.status = 'finished';
    await room.save();

    const hostPlayer = players.find((p) => p.playerId === room.hostPlayerId) || null;
    const publicRoom = formatPublicRoom(room, players, hostPlayer);

    return {
      success: true,
      statusCode: 200,
      message: 'Game ended by host.',
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },

  /**
   * Host permanently closes the entire multiplayer room.
   */
  async closeRoom(
    roomCode: string,
    requesterPlayerId: string
  ): Promise<ServiceResult<{ room: PublicRoom; game?: PublicGameState }>> {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPlayerId = requesterPlayerId.trim();

    const room = await RoomModel.findOne({ roomCode: cleanCode });
    if (!room) {
      return { success: false, statusCode: 404, message: 'Room not found.' };
    }

    if (room.hostPlayerId !== cleanPlayerId) {
      return { success: false, statusCode: 403, message: 'Only the host can close the room.' };
    }

    const now = new Date();
    room.status = 'closed';
    if (room.game) {
      room.game.status = 'ended';
      room.game.endedAt = now;
    }
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
      message: 'The host has closed this room.',
      data: {
        room: publicRoom,
        game: publicRoom.game,
      },
    };
  },
};
