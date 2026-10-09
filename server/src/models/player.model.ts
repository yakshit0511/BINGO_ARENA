import { Schema, model } from 'mongoose';
import { IPlayerDocument } from '../types';

const PlayerSchema = new Schema<IPlayerDocument>(
  {
    playerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    roomCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    isHost: {
      type: Boolean,
      default: false,
    },
    isConnected: {
      type: Boolean,
      default: true,
    },
    hasSubmitted: {
      type: Boolean,
      default: false,
    },
    board: {
      type: [Number],
      default: undefined,
    },
    submittedAt: {
      type: Date,
      default: undefined,
    },
    completedLines: {
      type: [String],
      default: [],
    },
    earnedLetters: {
      type: [String],
      default: [],
    },
    completedLineCount: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'players',
  }
);

// Compound indexes to facilitate fast querying of active room participants
PlayerSchema.index({ roomCode: 1, name: 1 });
PlayerSchema.index({ roomCode: 1, playerId: 1 });
PlayerSchema.index({ roomCode: 1, isConnected: 1 });

export const PlayerModel = model<IPlayerDocument>('Player', PlayerSchema);
