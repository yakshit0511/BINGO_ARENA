import { io, Socket } from 'socket.io-client';

function resolveSocketUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    if (!isLocal) {
      const envUrl =
        import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        import.meta.env.VITE_API_URL;
      if (envUrl && envUrl.startsWith('https://')) {
        return envUrl.replace(/\/+$/, '');
      }
      return 'https://bingo-arena-92ne.onrender.com';
    }
  }

  const raw =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://bingo-arena-92ne.onrender.com';
  return raw.replace(/\/+$/, '');
}

const SERVER_URL = resolveSocketUrl();

export type SocketConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED';

let socketInstance: Socket | null = null;
const statusListeners: Set<(status: SocketConnectionStatus) => void> = new Set();
let currentStatus: SocketConnectionStatus = 'DISCONNECTED';

function updateStatus(newStatus: SocketConnectionStatus) {
  if (currentStatus !== newStatus) {
    currentStatus = newStatus;
    statusListeners.forEach((listener) => listener(newStatus));
  }
}

/**
 * Helper to emit a socket event with a guaranteed timeout
 */
function emitWithTimeout<T>(
  socket: Socket,
  event: string,
  payload: any,
  timeoutMs = 3500,
  defaultError = 'Request timed out.'
): Promise<T> {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, message: defaultError } as unknown as T);
      }
    }, timeoutMs);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(event, payload, (res: T) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(res || ({ success: false, message: 'No response from server.' } as unknown as T));
      }
    });
  });
}

let activeRoomSession: { roomCode: string; playerId: string } | null = null;

export function setActiveRoomSession(roomCode: string, playerId: string) {
  activeRoomSession = { roomCode: roomCode.trim().toUpperCase(), playerId: playerId.trim() };
}

/**
 * Get or initialize the managed singleton Socket.IO connection.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    updateStatus('CONNECTING');

    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 15000,
      transports: ['polling', 'websocket'],
      withCredentials: false,
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.IO Client] Connected to server (id: ${socketInstance?.id}) at ${SERVER_URL}`);
      updateStatus('CONNECTED');
      if (activeRoomSession && socketInstance) {
        socketInstance.emit('room:join', activeRoomSession, () => {});
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket.IO Client] Disconnected (reason: ${reason})`);
      updateStatus('DISCONNECTED');
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('[Socket.IO Client] Connection error:', error.message);
      updateStatus('DISCONNECTED');
    });

    socketInstance.io.on('reconnect_attempt', () => {
      console.log('[Socket.IO Client] Attempting reconnect...');
      updateStatus('RECONNECTING');
    });

    socketInstance.io.on('reconnect', () => {
      console.log('[Socket.IO Client] Successfully reconnected');
      updateStatus('CONNECTED');
      if (activeRoomSession && socketInstance) {
        socketInstance.emit('room:join', activeRoomSession, () => {});
      }
    });
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Subscribe to socket connection status updates.
 */
export function onSocketStatusChange(
  listener: (status: SocketConnectionStatus) => void
): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Get current connection status.
 */
export function getSocketStatus(): SocketConnectionStatus {
  return currentStatus;
}

/**
 * Join room via socket with server acknowledgement.
 */
export function joinRoomSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: any }> {
  const cleanCode = roomCode.trim().toUpperCase();
  const cleanPlayerId = playerId.trim();
  activeRoomSession = { roomCode: cleanCode, playerId: cleanPlayerId };

  const socket = getSocket();
  const payload = {
    roomCode: cleanCode,
    playerId: cleanPlayerId,
  };

  return emitWithTimeout(socket, 'room:join', payload, 3500, 'Join room socket timed out.');
}

/**
 * Leave room via socket with server acknowledgement.
 */
export function leaveRoomSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string }> {
  activeRoomSession = null;
  const socket = getSocket();
  if (!socket.connected) {
    return Promise.resolve({ success: true });
  }

  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
  };

  return emitWithTimeout(socket, 'room:leave', payload, 2500, 'Leave room socket timed out.');
}

/**
 * Submit player bingo board via socket.
 */
export function submitBoardSocket(
  roomCode: string,
  playerId: string,
  cells: number[]
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
    cells,
  };

  return emitWithTimeout(socket, 'board:submit', payload, 3500, 'Board submit socket timed out.');
}

/**
 * Emit turn order update via socket with server acknowledgement.
 */
export function updateTurnOrderSocket(
  roomCode: string,
  playerId: string,
  playerOrder: string[]
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
    playerOrder,
  };

  return emitWithTimeout(socket, 'room:turn-order:update', payload, 3500, 'Turn order socket timed out.');
}

/**
 * Emit game start via socket with server acknowledgement.
 */
export function startGameSocket(
  roomCode: string,
  playerId: string,
  playerOrder?: string[]
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
    playerOrder,
  };

  return emitWithTimeout(socket, 'game:start', payload, 3500, 'Game start socket timed out.');
}

/**
 * Emit authoritative number-calling request via Socket.IO
 */
export function callNumberSocket(
  roomCode: string,
  playerId: string,
  number: number
): Promise<{ success: boolean; message?: string; game?: unknown; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
    number,
  };

  return emitWithTimeout(socket, 'game:number:call', payload, 3500, 'Call number socket timed out.');
}

/**
 * Request latest authoritative game and room state (refresh/reconnect sync)
 */
export function requestGameStateSocket(
  roomCode: string
): Promise<{ success: boolean; message?: string; game?: unknown; room?: unknown }> {
  const socket = getSocket();
  const payload = { roomCode: roomCode.trim().toUpperCase() };

  return emitWithTimeout(socket, 'game:request-state', payload, 3500, 'Request game state socket timed out.');
}

/**
 * Emit game restart request via socket with server acknowledgement
 */
export function restartGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
  };

  return emitWithTimeout(socket, 'game:restart', payload, 3500, 'Restart match socket timed out.');
}

/**
 * Emit game continue to next round via socket with server acknowledgement
 */
export function continueGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
  };

  return emitWithTimeout(socket, 'game:continue', payload, 3500, 'Continue match socket timed out.');
}

/**
 * Emit game end request via socket with server acknowledgement
 */
export function endGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
  };

  return emitWithTimeout(socket, 'game:end', payload, 3500, 'End game socket timed out.');
}

/**
 * Emit close room request via socket with server acknowledgement
 */
export function closeRoomSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();
  const payload = {
    roomCode: roomCode.trim().toUpperCase(),
    playerId: playerId.trim(),
  };

  return emitWithTimeout(socket, 'room:close', payload, 3500, 'Close room socket timed out.');
}

/**
 * Disconnect and release the socket.
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    updateStatus('DISCONNECTED');
  }
}
