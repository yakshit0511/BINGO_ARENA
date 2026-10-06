// test-prompt5-suite.js
// Automated verification suite for Prompt 5: Real-Time Multiplayer Lobby with Socket.IO

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api`;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSocket() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runPrompt5Suite() {
  console.log('--- STARTING PROMPT 5 REAL-TIME MULTIPLAYER LOBBY TEST SUITE ---');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // --- Test 1: Health & Database ---
  await test('Verify Health & Database connected', async () => {
    const res = await api('/health');
    if (res.status !== 200 || res.data.database !== 'connected') {
      throw new Error(`Database not connected: ${JSON.stringify(res.data)}`);
    }
  });

  // --- Test 2: Multi-player Real-time Join & Broadcast ---
  let roomCode = '';
  let hostPlayerId = '';
  let prashantPlayerId = '';
  let ayushPlayerId = '';
  let sohilPlayerId = '';

  let hostSocket;
  let prashantSocket;
  let ayushSocket;
  let sohilSocket;

  await test('Host creates 6x6 room with word YAKSHI (10 players limit)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 6,
        playerLimit: 10,
        winningWord: 'YAKSHI',
        callingMode: 'turn-based',
        hostParticipates: true,
        hostName: 'Yakshit',
      }),
    });
    if (res.status !== 201) throw new Error(`Create failed: ${JSON.stringify(res.data)}`);
    roomCode = res.data.data.roomCode;
    hostPlayerId = res.data.data.playerId;
  });

  await test('Host connects socket and joins room:join', async () => {
    hostSocket = createSocket();
    await new Promise((resolve, reject) => {
      hostSocket.on('connect', () => {
        hostSocket.emit(
          'room:join',
          { roomCode, playerId: hostPlayerId },
          (res) => {
            if (res.success && res.room) resolve();
            else reject(new Error(res.message || 'Host failed to join socket room'));
          }
        );
      });
      hostSocket.on('connect_error', reject);
    });
  });

  await test('Player 2 (Prashant) joins via API, connects socket, and Host receives live update (2/10)', async () => {
    // 1. API join
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, playerName: 'Prashant' }),
    });
    if (res.status !== 200) throw new Error(`Join failed: ${JSON.stringify(res.data)}`);
    prashantPlayerId = res.data.data.playerId;

    // 2. Set up listener on Host for state update
    const hostUpdatePromise = new Promise((resolve) => {
      hostSocket.once('room:state', (state) => {
        if (state.currentPlayers === 2 && state.players.some((p) => p.name === 'Prashant')) {
          resolve(state);
        }
      });
    });

    // 3. Prashant connects socket
    prashantSocket = createSocket();
    await new Promise((resolve, reject) => {
      prashantSocket.on('connect', () => {
        prashantSocket.emit(
          'room:join',
          { roomCode, playerId: prashantPlayerId },
          (ack) => {
            if (ack.success) resolve();
            else reject(new Error(ack.message || 'Prashant socket join failed'));
          }
        );
      });
    });

    await hostUpdatePromise;
  });

  await test('Player 3 (Ayush) & Player 4 (Sohil) join simultaneously -> all 4 clients sync to 4/10', async () => {
    // Join Ayush via API
    const res3 = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, playerName: 'Ayush' }),
    });
    ayushPlayerId = res3.data.data.playerId;

    // Join Sohil via API
    const res4 = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, playerName: 'Sohil' }),
    });
    sohilPlayerId = res4.data.data.playerId;

    // Setup state promises on both Host and Prashant sockets
    const hostSaw4 = new Promise((resolve) => {
      const handler = (state) => {
        if (state.currentPlayers === 4) {
          hostSocket.off('room:state', handler);
          resolve(state);
        }
      };
      hostSocket.on('room:state', handler);
    });

    const prashantSaw4 = new Promise((resolve) => {
      const handler = (state) => {
        if (state.currentPlayers === 4) {
          prashantSocket.off('room:state', handler);
          resolve(state);
        }
      };
      prashantSocket.on('room:state', handler);
    });

    // Connect Ayush & Sohil sockets
    ayushSocket = createSocket();
    sohilSocket = createSocket();

    await Promise.all([
      new Promise((resolve) => {
        ayushSocket.on('connect', () => {
          ayushSocket.emit('room:join', { roomCode, playerId: ayushPlayerId }, resolve);
        });
      }),
      new Promise((resolve) => {
        sohilSocket.on('connect', () => {
          sohilSocket.emit('room:join', { roomCode, playerId: sohilPlayerId }, resolve);
        });
      }),
    ]);

    const finalHostState = await hostSaw4;
    await prashantSaw4;

    if (finalHostState.players.length !== 4) {
      throw new Error(`Expected 4 players, got ${finalHostState.players.length}`);
    }
  });

  // --- Test 3: Disconnect Handling ---
  await test('Player 3 (Ayush) disconnects -> other clients receive isConnected=false, player not deleted', async () => {
    const disconnectEventPromise = new Promise((resolve) => {
      const handler = (state) => {
        const ayush = state.players.find((p) => p.playerId === ayushPlayerId);
        if (ayush && ayush.isConnected === false) {
          hostSocket.off('room:state', handler);
          resolve(state);
        }
      };
      hostSocket.on('room:state', handler);
    });

    // Disconnect Ayush's socket
    ayushSocket.disconnect();

    const state = await disconnectEventPromise;
    if (state.players.length !== 4) {
      throw new Error(`Ayush should NOT be deleted, player count was ${state.players.length}`);
    }
  });

  // --- Test 4: Reconnect Handling ---
  await test('Player 3 (Ayush) reconnects with stored session -> isConnected=true, no duplicate created', async () => {
    const reconnectEventPromise = new Promise((resolve) => {
      const handler = (state) => {
        const ayush = state.players.find((p) => p.playerId === ayushPlayerId);
        if (ayush && ayush.isConnected === true) {
          hostSocket.off('room:state', handler);
          resolve(state);
        }
      };
      hostSocket.on('room:state', handler);
    });

    // New socket for Ayush
    const newAyushSocket = createSocket();
    await new Promise((resolve, reject) => {
      newAyushSocket.on('connect', () => {
        newAyushSocket.emit('room:join', { roomCode, playerId: ayushPlayerId }, (ack) => {
          if (ack.success) resolve();
          else reject(new Error('Reconnection failed'));
        });
      });
    });

    const state = await reconnectEventPromise;
    const ayushCount = state.players.filter((p) => p.playerId === ayushPlayerId).length;
    if (ayushCount !== 1) {
      throw new Error(`Duplicate player found for Ayush! Count: ${ayushCount}`);
    }
    if (state.players.length !== 4) {
      throw new Error(`Expected 4 total players after reconnect, got ${state.players.length}`);
    }
  });

  // --- Test 5: Intentional Leave Handling ---
  await test('Player 4 (Sohil) leaves voluntarily (room:leave) -> removed from roster (count becomes 3)', async () => {
    const leaveStatePromise = new Promise((resolve) => {
      const handler = (state) => {
        if (state.currentPlayers === 3 && !state.players.some((p) => p.playerId === sohilPlayerId)) {
          hostSocket.off('room:state', handler);
          resolve(state);
        }
      };
      hostSocket.on('room:state', handler);
    });

    await new Promise((resolve) => {
      sohilSocket.emit('room:leave', { roomCode, playerId: sohilPlayerId }, resolve);
    });

    const state = await leaveStatePromise;
    if (state.players.length !== 3) {
      throw new Error(`Expected 3 players after leave, got ${state.players.length}`);
    }
  });

  // --- Test 6: Host Closes Room ---
  await test('Host leaves -> all remaining clients receive room:closed event', async () => {
    const prashantClosedPromise = new Promise((resolve) => {
      prashantSocket.once('room:closed', (data) => {
        resolve(data);
      });
    });

    // Host emits leave
    await new Promise((resolve) => {
      hostSocket.emit('room:leave', { roomCode, playerId: hostPlayerId }, resolve);
    });

    const closedData = await prashantClosedPromise;
    if (!closedData.message.includes('host has closed')) {
      throw new Error(`Unexpected message: ${JSON.stringify(closedData)}`);
    }
  });

  // --- Test 7: Invalid Socket Identity Rejection ---
  await test('Reject room:join with valid roomCode but invalid playerId', async () => {
    const testSocket = createSocket();
    await new Promise((resolve, reject) => {
      testSocket.on('connect', () => {
        testSocket.emit(
          'room:join',
          { roomCode, playerId: 'ply_fake_nonexistent_id' },
          (ack) => {
            if (ack && !ack.success) {
              resolve();
            } else {
              reject(new Error('Server should have rejected invalid player ID'));
            }
          }
        );
      });
    });
    testSocket.disconnect();
  });

  // Cleanup open sockets
  if (hostSocket) hostSocket.disconnect();
  if (prashantSocket) prashantSocket.disconnect();

  console.log(`\n======================================================`);
  console.log(`TOTAL REAL-TIME MULTIPLAYER TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt5Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
