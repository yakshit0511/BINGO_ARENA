import { Schema, model } from 'mongoose';
import { IRoomDocument } from '../types';

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
