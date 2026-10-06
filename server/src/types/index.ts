import { Document } from 'mongoose';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type CallingMode = 'random' | 'turn-based';
export type MarkingMode = 'auto' | 'manual';
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished' | 'closed';
export type GameStatus = 'waiting' | 'ready' | 'active' | 'won' | 'no_winner' | 'ended';

export interface GameConfig {
  gridSize: number;
  playerLimit: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates: boolean;
  markingMode?: MarkingMode;
}

export interface CallRecord {
  number: number;
  playerId: string;
  playerName: string;
  calledAt: Date;
}

export interface PublicCallRecord {
  number: number;
  playerId: string;
  playerName: string;
  calledAt: string;
}

export interface RoundPlayerProgress {
  playerId: string;
  playerName: string;
  earnedLetters: string[];
  completedLines: string[];
  completedLineCount: number;
}

export interface IRoundRecord {
  roundNumber: number;
  winnerId: string | null;
  winnerName: string | null;
  winningNumber: number | null;
  winningWord: string;
  totalCalls: number;
  startedAt: Date;
  endedAt: Date;
  noWinner?: boolean;
  playerProgress?: RoundPlayerProgress[];
  callHistory?: CallRecord[];
}

export interface PublicRoundRecord {
  roundNumber: number;
  winnerId: string | null;
  winnerName: string | null;
  winningNumber: number | null;
  winningWord: string;
  totalCalls: number;
  startedAt: string;
  endedAt: string;
  noWinner?: boolean;
  playerProgress?: RoundPlayerProgress[];
  callHistory?: PublicCallRecord[];
}

export interface PlayerRanking {
  playerId: string;
  playerName: string;
  rank: number;
  finishedAt: string;
}

export interface IGameState {
  status: GameStatus;
  startedAt: Date | null;
  endedAt?: Date | null;
  roundNumber?: number;
  roundHistory?: IRoundRecord[];
  playerOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  currentNumber: number | null;
  currentCallerName: string | null;
  turnNumber: number;
  calledNumbers: number[];
  callHistory: CallRecord[];
  lastCalledNumbers: CallRecord[];
  winnerId: string | null;
  winnerName: string | null;
  loserId?: string | null;
  loserName?: string | null;
  rankings?: Array<{
    playerId: string;
    playerName: string;
    rank: number;
    finishedAt: Date;
  }>;
  finishedPlayerIds?: string[];
  winningNumber: number | null;
  wonAt: Date | null;
  winningWord: string;
  completedLetters: number;
  winningLines?: string[];
  winnerProgress?: number;
  gamePlayers: string[];
}

export interface PublicGameState {
  status: GameStatus;
  startedAt: string | null;
  endedAt?: string | null;
  roundNumber: number;
  roundHistory: PublicRoundRecord[];
  playerOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  currentNumber: number | null;
  currentCallerName: string | null;
  turnNumber: number;
  calledNumbers: number[];
  callHistory: PublicCallRecord[];
  lastCalledNumbers: PublicCallRecord[];
  winnerId: string | null;
  winnerName: string | null;
  loserId?: string | null;
  loserName?: string | null;
  rankings?: PlayerRanking[];
  finishedPlayerIds?: string[];
  winningNumber: number | null;
  wonAt: string | null;
  winningWord: string;
  completedLetters: number;
  winningLines: string[];
  winnerProgress: number;
  gamePlayers: string[];
}

export interface IPlayerDocument extends Document {
  playerId: string;
  name: string;
  roomCode: string;
  isHost: boolean;
  isConnected: boolean;
  hasSubmitted: boolean;
  board?: number[];
  submittedAt?: Date;
  joinedAt: Date;
  lastSeenAt: Date;
  completedLines: string[];
  earnedLetters: string[];
  completedLineCount: number;
}

export interface IRoomDocument extends Document {
  roomCode: string;
  hostPlayerId: string;
  gridSize: number;
  playerLimit: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates: boolean;
  markingMode?: MarkingMode;
  players: string[]; // List of playerIds
  status: RoomStatus;
  turnOrder: string[];
  game: IGameState;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPlayer {
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

export interface PublicRoom {
  roomCode: string;
  gridSize: number;
  maxNumber: number;
  playerLimit: number;
  currentCount: number;
  currentPlayers: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates: boolean;
  markingMode?: MarkingMode;
  status: RoomStatus;
  allSubmitted: boolean;
  turnOrder: string[];
  game: PublicGameState;
  host: {
    playerId: string;
    name: string;
  };
  players: PublicPlayer[];
  createdAt: string;
}

export interface CreateRoomInput {
  gridSize: number;
  playerLimit: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates?: boolean;
  markingMode?: MarkingMode;
  hostName: string;
}

export interface JoinRoomInput {
  roomCode: string;
  playerName: string;
}

export interface LeaveRoomInput {
  playerId: string;
}

export interface PublicWinnerInfo {
  playerId: string;
  playerName: string;
  winningWord: string;
  winningNumber: number;
  wonAt: string;
  completedLines: string[];
  earnedLetters: string[];
}

export interface PublicPlayerEvaluation {
  playerId: string;
  playerName: string;
  allCompletedLines: string[];
  newlyCompletedLines: string[];
  earnedLetters: string[];
  newlyEarnedLetters: string[];
  completedLineCount: number;
  hasWon: boolean;
}

export interface CallNumberResultData {
  room: PublicRoom;
  game: PublicGameState;
  calledNumber: number;
  callRecord: PublicCallRecord;
  winner: PublicWinnerInfo | null;
  playerEvaluations: PublicPlayerEvaluation[];
}
