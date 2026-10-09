import { CreateRoomInput, JoinRoomInput } from '../types';

export interface ValidationSuccess<T> {
  isValid: true;
  data: T;
}

export interface ValidationFailure {
  isValid: false;
  error: string;
}

export type ValidationOutcome<T> = ValidationSuccess<T> | ValidationFailure;

const ALLOWED_PLAYER_LIMITS = new Set([5, 10, 15, 20, 25, 30]);
const ALLOWED_CALLING_MODES = new Set(['random', 'turn-based']);

/**
 * Validate room creation input fields on the backend.
 */
export function validateCreateRoomInput(
  rawBody: unknown
): ValidationOutcome<CreateRoomInput> {
  if (!rawBody || typeof rawBody !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const body = rawBody as Record<string, unknown>;

  // Host Name
  const rawHostName = body.hostName;
  if (typeof rawHostName !== 'string' || !rawHostName.trim()) {
    return { isValid: false, error: 'Host name is required.' };
  }
  const hostName = rawHostName.trim();
  if (hostName.length < 2 || hostName.length > 20) {
    return { isValid: false, error: 'Host name must be between 2 and 20 characters.' };
  }

  // Grid Size (5 to 20)
  const rawGridSize = Number(body.gridSize);
  if (!Number.isInteger(rawGridSize) || rawGridSize < 5 || rawGridSize > 20) {
    return { isValid: false, error: 'Grid size must be an integer between 5 and 20.' };
  }
  const gridSize = rawGridSize;

  // Player Limit (5, 10, 15, 20, 25, 30)
  const rawPlayerLimit = Number(body.playerLimit);
  if (!ALLOWED_PLAYER_LIMITS.has(rawPlayerLimit)) {
    return {
      isValid: false,
      error: 'Player limit must be one of the following: 5, 10, 15, 20, 25, 30.',
    };
  }
  const playerLimit = rawPlayerLimit;

  // Winning Word
  const rawWord = body.winningWord;
  if (typeof rawWord !== 'string' || !rawWord.trim()) {
    return { isValid: false, error: 'Winning word is required.' };
  }
  if (/\s/.test(rawWord)) {
    return { isValid: false, error: 'Winning word cannot contain spaces.' };
  }
  if (/\d/.test(rawWord)) {
    return { isValid: false, error: 'Winning word cannot contain numbers.' };
  }
  const cleanWord = rawWord.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(cleanWord)) {
    return {
      isValid: false,
      error: 'Winning word must contain only alphabetic characters (A-Z).',
    };
  }
  if (cleanWord.length !== gridSize) {
    return {
      isValid: false,
      error: `Winning word must contain exactly ${gridSize} letters (received ${cleanWord.length}).`,
    };
  }

  // Calling Mode ('random' | 'turn-based')
  const rawMode = String(body.callingMode || '').toLowerCase();
  if (!ALLOWED_CALLING_MODES.has(rawMode)) {
    return {
      isValid: false,
      error: "Calling mode must be either 'random' or 'turn-based'.",
    };
  }
  const callingMode = rawMode as 'random' | 'turn-based';

  // Host Participates (default true)
  const hostParticipates =
    typeof body.hostParticipates === 'boolean' ? body.hostParticipates : true;

  // Marking Mode ('auto' | 'manual', default 'auto')
  const rawMarkingMode = String(body.markingMode || '').toLowerCase();
  const markingMode = rawMarkingMode === 'manual' ? ('manual' as const) : ('auto' as const);

  return {
    isValid: true,
    data: {
      gridSize,
      playerLimit,
      winningWord: cleanWord,
      callingMode,
      hostParticipates,
      markingMode,
      hostName,
    },
  };
}

/**
 * Validate room join input fields on the backend.
 */
export function validateJoinRoomInput(
  rawBody: unknown
): ValidationOutcome<JoinRoomInput> {
  if (!rawBody || typeof rawBody !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }

  const body = rawBody as Record<string, unknown>;

  // Room Code (6 characters, alphanumeric)
  const rawCode = body.roomCode;
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    return { isValid: false, error: 'Room code is required.' };
  }
  const cleanCode = rawCode.trim().toUpperCase();
  if (cleanCode.length !== 6 || !/^[A-Z0-9]{6}$/.test(cleanCode)) {
    return {
      isValid: false,
      error: 'Room code must be exactly 6 alphanumeric characters.',
    };
  }

  // Player Name (2-20 characters)
  const rawName = body.playerName;
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return { isValid: false, error: 'Player name is required.' };
  }
  const cleanName = rawName.trim();
  if (cleanName.length < 2 || cleanName.length > 20) {
    return {
      isValid: false,
      error: 'Player name must be between 2 and 20 characters.',
    };
  }

  return {
    isValid: true,
    data: {
      roomCode: cleanCode,
      playerName: cleanName,
    },
  };
}

export interface BoardValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate player board numbers array against expected grid size.
 * For an N x N grid:
 * - Must be an array of length N^2
 * - Must contain integers from 1 to N^2
 * - Every number from 1 to N^2 must appear exactly once (no duplicates, no omissions)
 */
export function validatePlayerBoard(
  cells: unknown,
  expectedGridSize: number
): BoardValidationResult {
  if (!Array.isArray(cells)) {
    return { isValid: false, error: 'Board cells must be provided as an array.' };
  }

  const expectedCount = expectedGridSize * expectedGridSize;
  if (cells.length !== expectedCount) {
    return {
      isValid: false,
      error: `Board must contain exactly ${expectedCount} cells for a ${expectedGridSize}×${expectedGridSize} grid (received ${cells.length}).`,
    };
  }

  const seen = new Set<number>();
  for (let i = 0; i < cells.length; i++) {
    const val = cells[i];
    if (typeof val !== 'number' || !Number.isInteger(val)) {
      return {
        isValid: false,
        error: `Cell at index ${i} must be an integer, received: ${val}.`,
      };
    }

    if (val < 1 || val > expectedCount) {
      return {
        isValid: false,
        error: `Number ${val} at cell ${i} is outside valid range 1 to ${expectedCount}.`,
      };
    }

    if (seen.has(val)) {
      return {
        isValid: false,
        error: `Duplicate number ${val} detected on board. Every number must appear exactly once.`,
      };
    }
    seen.add(val);
  }

  if (seen.size !== expectedCount) {
    return {
      isValid: false,
      error: `Board is incomplete. Expected ${expectedCount} unique numbers, but found ${seen.size}.`,
    };
  }

  return { isValid: true };
}

export interface TurnOrderValidationResult {
  isValid: boolean;
  error?: string;
  cleanOrder?: string[];
}

/**
 * Validates configured player turn order.
 * - Must be an array of player IDs
 * - Must contain every room player exactly once
 * - No duplicates or unknown player IDs
 */
export function validateTurnOrderInput(
  rawOrder: unknown,
  allowedPlayerIds: string[]
): TurnOrderValidationResult {
  if (!Array.isArray(rawOrder)) {
    return { isValid: false, error: 'Turn order must be an array of player IDs.' };
  }

  if (rawOrder.length === 0) {
    return { isValid: false, error: 'Turn order cannot be empty.' };
  }

  if (rawOrder.length !== allowedPlayerIds.length) {
    return {
      isValid: false,
      error: `Turn order must include all ${allowedPlayerIds.length} participating players (received ${rawOrder.length}).`,
    };
  }

  const allowedSet = new Set(allowedPlayerIds);
  const seen = new Set<string>();
  const cleanOrder: string[] = [];

  for (let i = 0; i < rawOrder.length; i++) {
    const rawId = rawOrder[i];
    if (typeof rawId !== 'string' || !rawId.trim()) {
      return { isValid: false, error: `Invalid player ID at position ${i + 1}.` };
    }
    const id = rawId.trim();

    if (!allowedSet.has(id)) {
      return {
        isValid: false,
        error: `Player ID "${id}" does not belong to this room.`,
      };
    }

    if (seen.has(id)) {
      return {
        isValid: false,
        error: `Duplicate player "${id}" in turn order. Every participating player must appear exactly once.`,
      };
    }

    seen.add(id);
    cleanOrder.push(id);
  }

  return { isValid: true, cleanOrder };
}

