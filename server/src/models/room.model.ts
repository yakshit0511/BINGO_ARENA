import { Schema, model } from 'mongoose';
import { IRoomDocument } from '../types';

const CallRecordSchema = new Schema(
  {
    number: { type: Number, required: true },
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    calledAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RoundPlayerProgressSchema = new Schema(
  {
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    earnedLetters: { type: [String], default: [] },
    completedLines: { type: [String], default: [] },
    completedLineCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const RoundRecordSchema = new Schema(
  {
    roundNumber: { type: Number, required: true },
    winnerId: { type: String, default: null },
    winnerName: { type: String, default: null },
    winningNumber: { type: Number, default: null },
    winningWord: { type: String, default: '' },
    totalCalls: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: Date.now },
    noWinner: { type: Boolean, default: false },
    playerProgress: { type: [RoundPlayerProgressSchema], default: [] },
    callHistory: { type: [CallRecordSchema], default: [] },
  },
  { _id: false }
);

const GameStateSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['waiting', 'ready', 'active', 'won', 'no_winner', 'ended'],
      default: 'waiting',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    roundNumber: {
      type: Number,
      default: 1,
    },
    roundHistory: {
      type: [RoundRecordSchema],
      default: [],
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
    currentNumber: {
      type: Number,
      default: null,
    },
    currentCallerName: {
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
    callHistory: {
      type: [CallRecordSchema],
      default: [],
    },
    lastCalledNumbers: {
      type: [CallRecordSchema],
      default: [],
    },
    winnerId: {
      type: String,
      default: null,
    },
    winnerName: {
      type: String,
      default: null,
    },
    loserId: {
      type: String,
      default: null,
    },
    loserName: {
      type: String,
      default: null,
    },
    rankings: {
      type: [
        {
          playerId: { type: String, required: true },
          playerName: { type: String, required: true },
          rank: { type: Number, required: true },
          finishedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    finishedPlayerIds: {
      type: [String],
      default: [],
    },
    winningNumber: {
      type: Number,
      default: null,
    },
    wonAt: {
      type: Date,
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
    winningLines: {
      type: [String],
      default: [],
    },
    winnerProgress: {
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
        endedAt: null,
        roundNumber: 1,
        roundHistory: [],
        playerOrder: [],
        currentTurnIndex: 0,
        currentPlayerId: null,
        turnNumber: 0,
        calledNumbers: [],
        lastCalledNumbers: [],
        winnerId: null,
        winningWord: '',
        completedLetters: 0,
        winningLines: [],
        winnerProgress: 0,
        gamePlayers: [],
      }),
    },
    status: {
      type: String,
      enum: ['waiting', 'ready', 'playing', 'finished', 'closed'],
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
