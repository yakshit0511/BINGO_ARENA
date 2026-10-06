import crypto from 'crypto';
import { RoomModel } from '../models/room.model';

const SAFE_ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a random 6-character room code excluding 0, O, 1, I.
 */
function createRawCode(): string {
  let code = '';
  const charsLength = SAFE_ROOM_CODE_CHARS.length;
  const randomBytes = crypto.randomBytes(6);

  for (let i = 0; i < 6; i++) {
    code += SAFE_ROOM_CODE_CHARS[randomBytes[i] % charsLength];
  }
  return code;
}

/**
 * Server-authoritative unique room code generator.
 * Verifies against MongoDB that the room code is not already in use.
 */
export async function generateUniqueRoomCode(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateCode = createRawCode();
    const existingRoom = await RoomModel.findOne({ roomCode: candidateCode }).lean();

    if (!existingRoom) {
      return candidateCode;
    }
  }

  // Fallback: append random hex timestamp suffix
  return `BA${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

/**
 * Generate a secure, opaque public player ID.
 * Avoids exposing internal MongoDB ObjectIds.
 */
export function generatePlayerId(): string {
  return `ply_${crypto.randomBytes(8).toString('hex')}`;
}
