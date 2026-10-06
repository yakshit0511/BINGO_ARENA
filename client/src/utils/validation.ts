import { WordValidationResult } from '../types';

/**
 * Validates winning word against the current N×N grid dimension.
 * Strict rules:
 * - Alphabetic letters only (A-Z)
 * - Automatically converted to uppercase
 * - Exactly N letters long
 * - No spaces, numbers, or special characters
 */
export function validateWinningWord(
  rawWord: string,
  gridSize: number
): WordValidationResult {
  const cleanWord = rawWord.trim().toUpperCase();

  if (!cleanWord) {
    return {
      isValid: false,
      message: `Winning word must be exactly ${gridSize} letters (currently empty).`,
      cleanWord: '',
    };
  }

  // Check for spaces
  if (/\s/.test(rawWord)) {
    return {
      isValid: false,
      message: 'Spaces are not allowed in the winning word.',
      cleanWord,
    };
  }

  // Check for numbers
  if (/\d/.test(cleanWord)) {
    return {
      isValid: false,
      message: 'Numbers are not allowed. Only letters (A-Z) are permitted.',
      cleanWord,
    };
  }

  // Check for special characters
  if (!/^[A-Z]+$/.test(cleanWord)) {
    return {
      isValid: false,
      message: 'Special characters and symbols are not permitted.',
      cleanWord,
    };
  }

  // Check length against N
  if (cleanWord.length !== gridSize) {
    if (cleanWord.length < gridSize) {
      const remaining = gridSize - cleanWord.length;
      return {
        isValid: false,
        message: `Needs ${remaining} more letter${remaining > 1 ? 's' : ''} (exactly ${gridSize} required for ${gridSize}×${gridSize} grid).`,
        cleanWord,
      };
    } else {
      const excess = cleanWord.length - gridSize;
      return {
        isValid: false,
        message: `Too long by ${excess} letter${excess > 1 ? 's' : ''} (exactly ${gridSize} required for ${gridSize}×${gridSize} grid).`,
        cleanWord,
      };
    }
  }

  return {
    isValid: true,
    message: `✓ Valid ${gridSize}-letter winning word`,
    cleanWord,
  };
}

/**
 * Validates player nickname
 */
export function validatePlayerName(rawName: string): {
  isValid: boolean;
  message: string;
  cleanName: string;
} {
  const cleanName = rawName.trim();

  if (!cleanName) {
    return {
      isValid: false,
      message: 'Player name is required.',
      cleanName: '',
    };
  }

  if (cleanName.length < 2) {
    return {
      isValid: false,
      message: 'Player name must be at least 2 characters.',
      cleanName,
    };
  }

  if (cleanName.length > 20) {
    return {
      isValid: false,
      message: 'Player name cannot exceed 20 characters.',
      cleanName,
    };
  }

  return {
    isValid: true,
    message: '✓ Valid nickname',
    cleanName,
  };
}

/**
 * Validates room code
 */
export function validateRoomCode(rawCode: string): {
  isValid: boolean;
  message: string;
  cleanCode: string;
} {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      isValid: false,
      message: 'Room code is required.',
      cleanCode: '',
    };
  }

  if (cleanCode.length !== 6) {
    return {
      isValid: false,
      message: `Room code must be exactly 6 characters (${cleanCode.length}/6).`,
      cleanCode,
    };
  }

  if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
    return {
      isValid: false,
      message: 'Room code must contain only alphanumeric characters.',
      cleanCode,
    };
  }

  return {
    isValid: true,
    message: '✓ Valid room code format',
    cleanCode,
  };
}
