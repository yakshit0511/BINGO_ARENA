import { Document } from 'mongoose';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type CallingMode = 'random' | 'turn-based';
export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';
export type GameStatus = 'waiting' | 'ready' | 'active' | 'won' | 'ended';

export interface GameConfig {
  gridSize: number;
  playerLimit: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates: boolean;
}

export interface IGameState {
  status: GameStatus;
  startedAt: Date | null;
  playerOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  turnNumber: number;
  calledNumbers: number[];
  lastCalledNumbers: number[];
  winnerId: string | null;
  winningWord: string;
  completedLetters: number;
  gamePlayers: string[];
}

export interface PublicGameState {
  status: GameStatus;
  startedAt: string | null;
  playerOrder: string[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  turnNumber: number;
  calledNumbers: number[];
  lastCalledNumbers: number[];
  winnerId: string | null;
  winningWord: string;
  completedLetters: number;
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
}

export interface IRoomDocument extends Document {
  roomCode: string;
  hostPlayerId: string;
  gridSize: number;
  playerLimit: number;
  winningWord: string;
  callingMode: CallingMode;
  hostParticipates: boolean;
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
  hostName: string;
}

export interface JoinRoomInput {
  roomCode: string;
  playerName: string;
}

export interface LeaveRoomInput {
  playerId: string;
}
