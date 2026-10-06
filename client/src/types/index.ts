/**
 * Centralized Type Definitions for Bingo Arena
 * Matches frontend game configuration, room state, and upcoming API contracts.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export type CallingMode = 'random' | 'turn-based';

export interface GameConfig {
  gridSize: number; // N (e.g. 5 to 20)
  playerLimit: number; // 5 to 30
  winningWord: string; // Exactly N letters, uppercase alphabetic
  callingMode: CallingMode;
  hostParticipates: boolean;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
  avatarColor?: string;
  isConnected?: boolean;
  hasSubmitted?: boolean;
  board?: number[];
}

export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export interface Room {
  roomCode: string;
  hostId: string;
  hostName: string;
  config: GameConfig;
  players: Player[];
  status: RoomStatus;
  allSubmitted?: boolean;
  createdAt: number;
}

/**
 * Validation result for winning word
 */
export interface WordValidationResult {
  isValid: boolean;
  message: string;
  cleanWord: string;
}
