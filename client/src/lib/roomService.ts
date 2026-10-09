import { ApiResponse, GameConfig, Room, Player, RoomStatus, GameState, GameStatus, RoundRecord } from '../types';
import { API_BASE_URL } from '../constants';

const STORAGE_KEY = 'bingo_arena_current_room';
const PLAYER_KEY = 'bingo_arena_current_player';

import { savePlayerSession, clearPlayerSession } from './session';

export interface BackendPublicPlayer {
  playerId: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  hasSubmitted: boolean;
  joinedAt: string;
  completedLines?: string[];
  earnedLetters?: string[];
  completedLineCount?: number;
  board?: number[];
}

export interface BackendPublicCallRecord {
  number: number;
  playerId: string;
  playerName: string;
  calledAt: string;
}

export interface BackendPublicGameState {
  status: GameStatus;
  startedAt: string | null;
  endedAt?: string | null;
  roundNumber?: number;
  roundHistory?: RoundRecord[];
  playerOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  currentNumber: number | null;
  currentCallerName: string | null;
  turnNumber: number;
  calledNumbers: number[];
  callHistory?: BackendPublicCallRecord[];
  lastCalledNumbers: BackendPublicCallRecord[];
  winnerId: string | null;
  winnerName?: string | null;
  loserId?: string | null;
  loserName?: string | null;
  rankings?: Array<{
    playerId: string;
    playerName: string;
    rank: number;
    finishedAt: string;
  }>;
  finishedPlayerIds?: string[];
  winningNumber?: number | null;
  wonAt?: string | null;
  winningWord: string;
  completedLetters: number;
  winningLines?: string[];
  winnerProgress?: number;
  gamePlayers: string[];
}

export interface BackendPublicRoom {
  roomCode: string;
  gridSize: number;
  maxNumber: number;
  playerLimit: number;
  currentCount: number;
  currentPlayers: number;
  winningWord: string;
  callingMode: 'random' | 'turn-based';
  hostParticipates: boolean;
  markingMode?: 'auto' | 'manual';
  status: RoomStatus;
  allSubmitted?: boolean;
  turnOrder?: string[];
  game?: BackendPublicGameState;
  host: {
    playerId: string;
    name: string;
  };
  players: BackendPublicPlayer[];
  createdAt: string;
}

export interface BackendRoomResponseData {
  roomCode: string;
  playerId: string;
  isHost: boolean;
  room: BackendPublicRoom;
}

/**
 * Maps server-authoritative PublicRoom payload to client Room model
 */
export function mapBackendRoomToClient(backendRoom: BackendPublicRoom): Room {
  if (!backendRoom || typeof backendRoom !== 'object') {
    return {
      roomCode: '',
      hostId: '',
      hostName: '',
      config: {
        gridSize: 5,
        playerLimit: 10,
        winningWord: 'BINGO',
        callingMode: 'turn-based',
        hostParticipates: true,
        markingMode: 'auto',
      },
      players: [],
      status: 'waiting',
      markingMode: 'auto',
      allSubmitted: false,
      turnOrder: [],
      createdAt: Date.now(),
    };
  }

  const rawPlayers = Array.isArray(backendRoom.players) ? backendRoom.players : [];
  const players: Player[] = rawPlayers.map((p, idx) => {
    const avatarColors = ['#7C3AED', '#D946EF', '#F59E0B', '#EC4899', '#10B981', '#3B82F6'];
    const color = p.isHost ? '#7C3AED' : avatarColors[(idx + 1) % avatarColors.length];

    return {
      id: p.playerId,
      name: p.name,
      isHost: p.isHost,
      isReady: p.hasSubmitted,
      joinedAt: p.joinedAt ? new Date(p.joinedAt).getTime() : Date.now(),
      avatarColor: color,
      isConnected: p.isConnected !== false,
      hasSubmitted: p.hasSubmitted,
      completedLines: p.completedLines || [],
      earnedLetters: p.earnedLetters || [],
      completedLineCount: p.completedLineCount || 0,
      board: p.board,
    };
  });

  return {
    roomCode: backendRoom.roomCode || '',
    hostId: backendRoom.host?.playerId || '',
    hostName: backendRoom.host?.name || '',
    config: {
      gridSize: backendRoom.gridSize || 5,
      playerLimit: backendRoom.playerLimit || 10,
      winningWord: backendRoom.winningWord || 'BINGO',
      callingMode: backendRoom.callingMode || 'turn-based',
      hostParticipates: backendRoom.hostParticipates !== false,
      markingMode: backendRoom.markingMode || 'auto',
    },
    players,
    status: (backendRoom.status ? backendRoom.status.toLowerCase() : 'waiting') as RoomStatus,
    markingMode: backendRoom.markingMode || 'auto',
    allSubmitted:
      backendRoom.allSubmitted ??
      (players.length > 0 && players.every((p) => p.hasSubmitted)),
    turnOrder: backendRoom.turnOrder || [],
    game: backendRoom.game
      ? {
          status: backendRoom.game.status,
          startedAt: backendRoom.game.startedAt,
          endedAt: backendRoom.game.endedAt || null,
          roundNumber: backendRoom.game.roundNumber || 1,
          roundHistory: backendRoom.game.roundHistory || [],
          playerOrder: backendRoom.game.playerOrder || [],
          currentTurnIndex: backendRoom.game.currentTurnIndex || 0,
          currentPlayerId: backendRoom.game.currentPlayerId || null,
          currentNumber: backendRoom.game.currentNumber ?? null,
          currentCallerName: backendRoom.game.currentCallerName ?? null,
          turnNumber: backendRoom.game.turnNumber || 0,
          calledNumbers: backendRoom.game.calledNumbers || [],
          callHistory: backendRoom.game.callHistory || [],
          lastCalledNumbers: backendRoom.game.lastCalledNumbers || [],
          winnerId: backendRoom.game.winnerId || null,
          winnerName: backendRoom.game.winnerName || null,
          loserId: backendRoom.game.loserId || null,
          loserName: backendRoom.game.loserName || null,
          rankings: backendRoom.game.rankings || [],
          finishedPlayerIds: backendRoom.game.finishedPlayerIds || [],
          winningNumber: backendRoom.game.winningNumber ?? null,
          wonAt: backendRoom.game.wonAt || null,
          winningWord: backendRoom.game.winningWord || backendRoom.winningWord,
          completedLetters: backendRoom.game.completedLetters || 0,
          winningLines: backendRoom.game.winningLines || [],
          winnerProgress: backendRoom.game.winnerProgress || 0,
          gamePlayers: backendRoom.game.gamePlayers || [],
        }
      : undefined,
    createdAt: backendRoom.createdAt ? new Date(backendRoom.createdAt).getTime() : Date.now(),
  };
}

/**
 * Production MongoDB-backed room service communicating with Express backend.
 */
export const roomService = {
  /**
   * Create a new room on the server backed by MongoDB Atlas
   */
  async createRoom(
    hostName: string,
    config: GameConfig
  ): Promise<ApiResponse<Room>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gridSize: config.gridSize,
          playerLimit: config.playerLimit,
          winningWord: config.winningWord,
          callingMode: config.callingMode,
          hostParticipates: config.hostParticipates,
          markingMode: config.markingMode || 'auto',
          hostName: hostName.trim(),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || `Failed to create room (${response.status})`,
        };
      }

      const data = json.data as BackendRoomResponseData;
      const clientRoom = mapBackendRoomToClient(data.room);

      const hostPlayer: Player = {
        id: data.playerId,
        name: hostName.trim(),
        isHost: true,
        isReady: true,
        joinedAt: Date.now(),
        avatarColor: '#7C3AED',
      };

      // Persist in session storage
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clientRoom));
        sessionStorage.setItem(PLAYER_KEY, JSON.stringify(hostPlayer));
        savePlayerSession({
          roomCode: clientRoom.roomCode,
          playerId: data.playerId,
          playerName: hostName.trim(),
          isHost: true,
        });
      } catch {
        // Storage unavailable
      }

      return {
        success: true,
        message: json.message || 'Room created successfully',
        data: clientRoom,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Join an existing room via POST /api/rooms/join
   */
  async joinRoom(
    roomCode: string,
    playerName: string
  ): Promise<ApiResponse<{ room: Room; player: Player }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode.trim().toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || `Failed to join room (${response.status})`,
        };
      }

      const data = json.data as BackendRoomResponseData;
      const clientRoom = mapBackendRoomToClient(data.room);

      const joinedPlayer: Player = {
        id: data.playerId,
        name: playerName.trim(),
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
        avatarColor: '#D946EF',
      };

      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clientRoom));
        sessionStorage.setItem(PLAYER_KEY, JSON.stringify(joinedPlayer));
        savePlayerSession({
          roomCode: clientRoom.roomCode,
          playerId: data.playerId,
          playerName: playerName.trim(),
          isHost: false,
        });
      } catch {
        // Storage unavailable
      }

      return {
        success: true,
        message: json.message || 'Joined room successfully',
        data: {
          room: clientRoom,
          player: joinedPlayer,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Fetch latest room details from GET /api/rooms/:roomCode
   */
  async getRoom(roomCode: string): Promise<ApiResponse<Room>> {
    const cleanCode = roomCode.trim().toUpperCase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${API_BASE_URL}/api/rooms/${cleanCode}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await response.json();

      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to retrieve room.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data as BackendPublicRoom);

      // Keep session storage updated
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clientRoom));
      } catch {
        // Storage unavailable
      }

      return {
        success: true,
        message: 'Room details updated',
        data: clientRoom,
      };
    } catch (error) {
      // Graceful fallback to locally cached room if server is waking up or request timed out
      const cached = this.getCurrentRoom();
      if (cached && cached.roomCode === cleanCode) {
        return {
          success: true,
          message: 'Loaded from local cache',
          data: cached,
        };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reach server.',
      };
    }
  },

  /**
   * Player leaves room via POST /api/rooms/:roomCode/leave
   */
  async leaveRoom(roomCode: string, playerId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/leave`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        }
      );

      const json = await response.json();
      return json;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reach server.',
      };
    } finally {
      this.clearSession();
    }
  },

  /**
   * Get cached room from session storage
   */
  getCurrentRoom(): Room | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get cached player from session storage
   */
  getCurrentPlayer(): Player | null {
    try {
      const stored = sessionStorage.getItem(PLAYER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Submit and lock player's Bingo board to server.
   */
  async submitBoard(
    roomCode: string,
    playerId: string,
    cells: number[]
  ): Promise<ApiResponse<{ room: Room; board: number[] }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/players/${playerId.trim()}/board`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cells }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to submit board.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room as BackendPublicRoom);
      return {
        success: true,
        message: json.message || 'Board submitted successfully',
        data: {
          room: clientRoom,
          board: json.data.board,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Retrieve player's saved board.
   */
  async getBoard(
    roomCode: string,
    playerId: string
  ): Promise<ApiResponse<{ board: number[]; isSubmitted: boolean }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/players/${playerId.trim()}/board`
      );
      const json = await response.json();
      return json;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reach server.',
      };
    }
  },

  /**
   * Update configured player turn order (Host only)
   */
  async updateTurnOrder(
    roomCode: string,
    playerId: string,
    playerOrder: string[]
  ): Promise<ApiResponse<Room>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/turn-order`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId,
            playerOrder,
          }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to update turn order.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data as BackendPublicRoom);
      return {
        success: true,
        message: json.message || 'Turn order updated successfully',
        data: clientRoom,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Authoritatively start the game (Host only)
   */
  async startGame(
    roomCode: string,
    playerId: string,
    playerOrder?: string[]
  ): Promise<ApiResponse<{ room: Room; game: BackendPublicGameState }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/game/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId,
            playerOrder,
          }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to start game.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room as BackendPublicRoom);
      return {
        success: true,
        message: json.message || 'Game started successfully',
        data: {
          room: clientRoom,
          game: json.data.game,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Authoritative Number Calling API (POST /api/rooms/:roomCode/game/call-number)
   */
  async callNumber(
    roomCode: string,
    playerId: string,
    number: number
  ): Promise<
    ApiResponse<{
      room: Room;
      game: GameState;
      calledNumber: number;
    }>
  > {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/game/call-number`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId: playerId.trim(),
            number,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to call number on server.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clientRoom));
      } catch {
        // Storage unavailable
      }

      return {
        success: true,
        message: json.message || 'Number called successfully',
        data: {
          room: clientRoom,
          game: json.data.game,
          calledNumber: json.data.calledNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Host restarts match without rebuilding the room
   */
  async restartGame(
    roomCode: string,
    playerId: string
  ): Promise<ApiResponse<{ room: Room; game: GameState }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/game/restart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to restart match.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message || 'Match restarted successfully.',
        data: {
          room: clientRoom,
          game: json.data.game,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Host explicitly ends the match
   */
  async endGame(
    roomCode: string,
    playerId: string
  ): Promise<ApiResponse<{ room: Room; game: GameState }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/game/end`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to end match.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message || 'Match ended.',
        data: {
          room: clientRoom,
          game: json.data.game,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Host continues the match to a new round after a win
   */
  async continueGame(
    roomCode: string,
    playerId: string
  ): Promise<ApiResponse<{ room: Room; game: GameState }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/game/continue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to continue to next round.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message || 'Next round started.',
        data: {
          room: clientRoom,
          game: json.data.game,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Host closes the entire room session
   */
  async closeRoom(
    roomCode: string,
    playerId: string
  ): Promise<ApiResponse<{ room: Room; game?: GameState }>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/close`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId }),
        }
      );

      const json = await response.json();
      if (!response.ok || !json.success) {
        return {
          success: false,
          message: json.message || 'Failed to close room.',
        };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message || 'Room closed.',
        data: {
          room: clientRoom,
          game: json.data.game,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to connect to server.',
      };
    }
  },

  /**
   * Host removes a player from the room.
   */
  async kickPlayer(
    roomCode: string,
    hostPlayerId: string,
    targetPlayerId: string
  ): Promise<ApiResponse<{ room: Room; kickedPlayerId: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostPlayerId: hostPlayerId.trim(), targetPlayerId: targetPlayerId.trim() }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, message: json.message || 'Failed to remove player.' };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message,
        data: {
          room: clientRoom,
          kickedPlayerId: json.data.kickedPlayerId,
        },
      };
    } catch {
      return { success: false, message: 'Network error while removing player.' };
    }
  },

  /**
   * Host updates room marking mode ('auto' | 'manual').
   */
  async updateMarkingMode(
    roomCode: string,
    hostPlayerId: string,
    markingMode: 'auto' | 'manual'
  ): Promise<ApiResponse<{ room: Room }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}/marking-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostPlayerId: hostPlayerId.trim(), markingMode }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        return { success: false, message: json.message || 'Failed to update marking mode.' };
      }

      const clientRoom = mapBackendRoomToClient(json.data.room);
      return {
        success: true,
        message: json.message,
        data: { room: clientRoom },
      };
    } catch {
      return { success: false, message: 'Network error while updating marking mode.' };
    }
  },

  /**
   * Clear session storage
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(PLAYER_KEY);
      clearPlayerSession();
    } catch {
      // Storage unavailable
    }
  },
};
