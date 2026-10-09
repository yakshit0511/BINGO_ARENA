/**
 * Player Session Storage Manager
 * Stores browser-session game identity across reloads and navigation.
 * Uses both sessionStorage and localStorage for resilience across hard refreshes.
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
 * Persist current player session to storage.
 */
export function savePlayerSession(session: PlayerSession): void {
  try {
    const code = session.roomCode.trim().toUpperCase();
    const payload = JSON.stringify({
      roomCode: code,
      playerId: session.playerId.trim(),
      playerName: session.playerName.trim(),
      isHost: Boolean(session.isHost),
    });

    // Store room-specific session key
    sessionStorage.setItem(`bingo_room_session_${code}`, payload);
    localStorage.setItem(`bingo_room_session_${code}`, payload);

    // Keep global last session for quick restore
    sessionStorage.setItem(STORAGE_KEYS.ROOM_CODE, code);
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_ID, session.playerId);
    sessionStorage.setItem(STORAGE_KEYS.PLAYER_NAME, session.playerName);
    sessionStorage.setItem(STORAGE_KEYS.IS_HOST, String(session.isHost));

    localStorage.setItem(STORAGE_KEYS.ROOM_CODE, code);
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, session.playerId);
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, session.playerName);
    localStorage.setItem(STORAGE_KEYS.IS_HOST, String(session.isHost));
  } catch (err) {
    console.warn('Failed to save session:', err);
  }
}

/**
 * Retrieve current player session from sessionStorage or localStorage.
 * If targetRoomCode is passed, specifically retrieves the session matching that room.
 */
export function getPlayerSession(targetRoomCode?: string): PlayerSession | null {
  try {
    if (targetRoomCode) {
      const code = targetRoomCode.trim().toUpperCase();
      const rawRoomSession =
        sessionStorage.getItem(`bingo_room_session_${code}`) ||
        localStorage.getItem(`bingo_room_session_${code}`);

      if (rawRoomSession) {
        const parsed = JSON.parse(rawRoomSession);
        if (parsed.playerId && parsed.playerName) {
          return {
            roomCode: code,
            playerId: parsed.playerId,
            playerName: parsed.playerName,
            isHost: Boolean(parsed.isHost),
          };
        }
      }
    }

    const roomCode =
      sessionStorage.getItem(STORAGE_KEYS.ROOM_CODE) ||
      localStorage.getItem(STORAGE_KEYS.ROOM_CODE);
    const playerId =
      sessionStorage.getItem(STORAGE_KEYS.PLAYER_ID) ||
      localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    const playerName =
      sessionStorage.getItem(STORAGE_KEYS.PLAYER_NAME) ||
      localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    const isHostVal =
      sessionStorage.getItem(STORAGE_KEYS.IS_HOST) ||
      localStorage.getItem(STORAGE_KEYS.IS_HOST);
    const isHost = isHostVal === 'true';

    if (roomCode && playerId && playerName) {
      const cleanCode = roomCode.trim().toUpperCase();
      // If a specific target room is requested, only return if room codes match
      if (targetRoomCode && cleanCode !== targetRoomCode.trim().toUpperCase()) {
        return null;
      }
      return {
        roomCode: cleanCode,
        playerId: playerId.trim(),
        playerName: playerName.trim(),
        isHost,
      };
    }
  } catch (err) {
    console.warn('Failed to retrieve session:', err);
  }
  return null;
}

/**
 * Clear stored player session on intentional departure or match close.
 */
export function clearPlayerSession(targetRoomCode?: string): void {
  try {
    if (targetRoomCode) {
      const code = targetRoomCode.trim().toUpperCase();
      sessionStorage.removeItem(`bingo_room_session_${code}`);
      localStorage.removeItem(`bingo_room_session_${code}`);
    }

    sessionStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    sessionStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    sessionStorage.removeItem(STORAGE_KEYS.IS_HOST);

    localStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);
    localStorage.removeItem(STORAGE_KEYS.IS_HOST);
  } catch (err) {
    console.warn('Failed to clear storage session:', err);
  }
}
