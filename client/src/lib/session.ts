/**
 * Player Session Storage Manager
 * Stores temporary browser-session game identity in sessionStorage.
 * Does not store sensitive secrets.
 */

const STORAGE_KEYS = {
  ROOM_CODE: 'bingo_room_code',
  PLAYER_ID: 'bingo_player_id',
  PLAYER_NAME: 'bingo_player_name',
  IS_HOST: 'bingo_is_host',
};

export interface PlayerSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

/**
 * Persist current player session to sessionStorage.
 */
export function savePlayerSession(session: PlayerSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.ROOM_CODE, session.roomCode.toUpperCase());
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, session.playerId);
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, session.playerName);
    sessionStorage.setItem(STORAGE_KEYS.IS_HOST, String(session.isHost));
  } catch (err) {
    console.warn('Failed to save session to sessionStorage:', err);
  }
}

/**
 * Retrieve current player session from sessionStorage if available.
 */
export function getPlayerSession(): PlayerSession | null {
  try {
    const roomCode = sessionStorage.getItem(STORAGE_KEYS.ROOM_CODE);
    const playerId = sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    const playerName = sessionStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    const isHost = sessionStorage.getItem(STORAGE_KEYS.IS_HOST) === 'true';

    if (roomCode && playerId && playerName) {
      return {
        roomCode,
        playerId,
        playerName,
        isHost,
      };
    }
  } catch (err) {
    console.warn('Failed to retrieve session from sessionStorage:', err);
  }
  return null;
}

/**
 * Clear stored player session on intentional departure or match close.
 */
export function clearPlayerSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    sessionStorage.removeItem(STORAGE_KEYS.IS_HOST);
  } catch (err) {
    console.warn('Failed to clear sessionStorage:', err);
  }
}
