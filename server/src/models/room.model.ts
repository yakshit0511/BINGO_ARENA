import { Schema, model } from 'mongoose';
import { IRoomDocument } from '../types';

const GameStateSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['waiting', 'ready', 'active', 'won', 'ended'],
      default: 'waiting',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    playerOrder: {
      type: [String],
      default: [],
    },
    currentTurnIndex: {
      type: Number,
      default: 0,
    },
    currentPlayerId: {
      type: String,
      default: null,
    },
    turnNumber: {
      type: Number,
      default: 0,
    },
    calledNumbers: {
      type: [Number],
      default: [],
    },
    lastCalledNumbers: {
      type: [Number],
      default: [],
    },
    winnerId: {
      type: String,
      default: null,
    },
    winningWord: {
      type: String,
      default: '',
    },
    completedLetters: {
      type: Number,
      default: 0,
    },
    gamePlayers: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const RoomSchema = new Schema<IRoomDocument>(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      length: 6,
      index: true,
    },
    hostPlayerId: {
      type: String,
      required: true,
      index: true,
    },
    gridSize: {
      type: Number,
      required: true,
      min: 5,
      max: 20,
    },
    playerLimit: {
      type: Number,
      required: true,
      enum: [5, 10, 15, 20, 25, 30],
    },
    winningWord: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    callingMode: {
      type: String,
      required: true,
      enum: ['random', 'turn-based'],
      default: 'turn-based',
    },
    hostParticipates: {
      type: Boolean,
      default: true,
    },
    players: {
      type: [String],
      default: [],
    },
    turnOrder: {
      type: [String],
      default: [],
    },
    game: {
      type: GameStateSchema,
      default: () => ({
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
      }),
    },
    status: {
      type: String,
      enum: ['waiting', 'ready', 'playing', 'finished'],
      default: 'waiting',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'rooms',
  }
);

export const RoomModel = model<IRoomDocument>('Room', RoomSchema);
