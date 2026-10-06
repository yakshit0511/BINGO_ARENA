import { ApiResponse, GameConfig, Room, Player, RoomStatus } from '../types';
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
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  allSubmitted?: boolean;
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
  const players: Player[] = backendRoom.players.map((p, idx) => {
    const avatarColors = ['#7C3AED', '#D946EF', '#F59E0B', '#EC4899', '#10B981', '#3B82F6'];
    const color = p.isHost ? '#7C3AED' : avatarColors[(idx + 1) % avatarColors.length];

    return {
      id: p.playerId,
      name: p.name,
      isHost: p.isHost,
      isReady: p.hasSubmitted,
      joinedAt: new Date(p.joinedAt).getTime(),
      avatarColor: color,
      isConnected: p.isConnected !== false,
      hasSubmitted: p.hasSubmitted,
    };
  });

  return {
    roomCode: backendRoom.roomCode,
    hostId: backendRoom.host.playerId,
    hostName: backendRoom.host.name,
    config: {
      gridSize: backendRoom.gridSize,
      playerLimit: backendRoom.playerLimit,
      winningWord: backendRoom.winningWord,
      callingMode: backendRoom.callingMode,
      hostParticipates: backendRoom.hostParticipates,
    },
    players,
    status: backendRoom.status.toLowerCase() as RoomStatus,
    allSubmitted:
      backendRoom.allSubmitted ??
      (backendRoom.players.length > 0 && backendRoom.players.every((p) => p.hasSubmitted)),
    createdAt: new Date(backendRoom.createdAt).getTime(),
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
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomCode.trim().toUpperCase()}`);
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
