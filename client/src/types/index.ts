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
export type MarkingMode = 'auto' | 'manual';

export interface GameConfig {
  gridSize: number; // N (e.g. 5 to 12)
  playerLimit: number; // 5 to 30
  winningWord: string; // Exactly N letters, uppercase alphabetic
  callingMode: CallingMode;
  hostParticipates: boolean;
  markingMode?: MarkingMode;
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
  completedLines?: string[];
  earnedLetters?: string[];
  completedLineCount?: number;
}

export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'closed';
export type GameStatus = 'waiting' | 'ready' | 'active' | 'won' | 'no_winner' | 'ended';

export interface CallRecord {
  number: number;
  playerId: string;
  playerName: string;
  calledAt: string;
}

export interface WinnerInfo {
  playerId: string;
  playerName: string;
  winningWord: string;
  winningNumber: number;
  wonAt: string;
  completedLines: string[];
  earnedLetters: string[];
}

export interface RoundPlayerProgress {
  playerId: string;
  playerName: string;
  earnedLetters: string[];
  completedLines: string[];
  completedLineCount: number;
}

export interface RoundRecord {
  roundNumber: number;
  winnerId: string | null;
  winnerName: string | null;
  winningNumber: number | null;
  winningWord: string;
  totalCalls: number;
  startedAt: string;
  endedAt: string;
  noWinner: boolean;
  playerProgress: RoundPlayerProgress[];
  callHistory: CallRecord[];
}

export interface PlayerRanking {
  playerId: string;
  playerName: string;
  rank: number;
  finishedAt: string;
}

export interface GameState {
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
  callHistory?: CallRecord[];
  lastCalledNumbers: CallRecord[];
  winnerId: string | null;
  winnerName?: string | null;
  loserId?: string | null;
  loserName?: string | null;
  rankings?: PlayerRanking[];
  finishedPlayerIds?: string[];
  winningNumber?: number | null;
  wonAt?: string | null;
  winningWord: string;
  completedLetters: number;
  winningLines?: string[];
  winnerProgress?: number;
  gamePlayers: string[];
}

export interface Room {
  roomCode: string;
  hostId: string;
  hostName: string;
  config: GameConfig;
  players: Player[];
  status: RoomStatus;
  markingMode?: MarkingMode;
  allSubmitted?: boolean;
  turnOrder?: string[];
  game?: GameState;
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
