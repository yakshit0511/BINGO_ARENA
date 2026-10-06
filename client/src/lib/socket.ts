import { io, Socket } from 'socket.io-client';

const rawSocketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001';

const SERVER_URL = rawSocketUrl.replace(/\/+$/, '');

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
 * Get or initialize the managed singleton Socket.IO connection.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    updateStatus('CONNECTING');

    socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.IO Client] Connected to server (id: ${socketInstance?.id})`);
      updateStatus('CONNECTED');
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
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit('room:join', payload, (res: { success: boolean; message?: string; room?: any }) => {
      resolve(res || { success: false, message: 'No response from server.' });
    });
  });
}

/**
 * Leave room via socket with server acknowledgement.
 */
export function leaveRoomSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ success: true });
      return;
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit('room:leave', payload, (res: { success: boolean; message?: string }) => {
      resolve(res || { success: true });
    });
  });
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

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
      playerOrder,
    };

    socket.emit('room:turn-order:update', payload, (res: { success: boolean; message?: string; room?: unknown }) => {
      resolve(res || { success: false, message: 'No response from server.' });
    });
  });
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

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
      playerOrder,
    };

    socket.emit('game:start', payload, (res: { success: boolean; message?: string; room?: unknown }) => {
      resolve(res || { success: false, message: 'No response from server.' });
    });
  });
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

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
      number,
    };

    socket.emit(
      'game:number:call',
      payload,
      (res: { success: boolean; message?: string; game?: unknown; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
}

/**
 * Request latest authoritative game and room state (refresh/reconnect sync)
 */
export function requestGameStateSocket(
  roomCode: string
): Promise<{ success: boolean; message?: string; game?: unknown; room?: unknown }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      'game:request-state',
      { roomCode: roomCode.trim().toUpperCase() },
      (res: { success: boolean; message?: string; game?: unknown; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
}

/**
 * Emit game restart request via socket with server acknowledgement
 */
export function restartGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit(
      'game:restart',
      payload,
      (res: { success: boolean; message?: string; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
}

/**
 * Emit game continue to next round via socket with server acknowledgement
 */
export function continueGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit(
      'game:continue',
      payload,
      (res: { success: boolean; message?: string; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
}

/**
 * Emit game end request via socket with server acknowledgement
 */
export function endGameSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit(
      'game:end',
      payload,
      (res: { success: boolean; message?: string; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
}

/**
 * Emit close room request via socket with server acknowledgement
 */
export function closeRoomSocket(
  roomCode: string,
  playerId: string
): Promise<{ success: boolean; message?: string; room?: unknown }> {
  const socket = getSocket();

  return new Promise((resolve) => {
    if (!socket.connected) {
      socket.connect();
    }

    const payload = {
      roomCode: roomCode.trim().toUpperCase(),
      playerId: playerId.trim(),
    };

    socket.emit(
      'room:close',
      payload,
      (res: { success: boolean; message?: string; room?: unknown }) => {
        resolve(res || { success: false, message: 'No response from server.' });
      }
    );
  });
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
