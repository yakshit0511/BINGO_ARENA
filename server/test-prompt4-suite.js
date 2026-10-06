// test-prompt4-suite.js
// Exhaustive test suite for Prompt 4 requirements

async function runTests() {
  const baseURL = 'http://localhost:5000/api';
  console.log('--- STARTING PROMPT 4 EXHAUSTIVE TEST SUITE ---');

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

  // Helper fetch
  async function api(path, options = {}) {
    const res = await fetch(`${baseURL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  // 1. Health & Database check
  await test('GET /api/health reports database connected', async () => {
    const res = await api('/health');
    if (res.status !== 200 || res.data.database !== 'connected') {
      throw new Error(`Expected 200 and database: "connected", got ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Success Case: 6x6, 10 players, YAKSHI, turn-based, host Yakshit
  let createdRoomCode = '';
  let hostPlayerId = '';
  await test('Create 6x6 room with word YAKSHI (turn-based, 10 players)', async () => {
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
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (!res.data.data?.roomCode || res.data.data.roomCode.length !== 6) {
      throw new Error(`Invalid room code: ${res.data.data?.roomCode}`);
    }
    if (!res.data.data?.playerId) throw new Error('Missing host playerId');
    createdRoomCode = res.data.data.roomCode;
    hostPlayerId = res.data.data.playerId;
    if (res.data.data.room.maxNumber !== 36) {
      throw new Error(`Expected maxNumber 36, got ${res.data.data.room.maxNumber}`);
    }
  });

  // 3. Join player Prashant
  let prashantPlayerId = '';
  await test('Join player Prashant to room', async () => {
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: createdRoomCode,
        playerName: 'Prashant',
      }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.data.room.currentPlayers !== 2) {
      throw new Error(`Expected 2 players, got ${res.data.data.room.currentPlayers}`);
    }
    prashantPlayerId = res.data.data.playerId;
  });

  // 4. Duplicate player name rejection in same room
  await test('Reject duplicate player name "Prashant" (409)', async () => {
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: createdRoomCode,
        playerName: 'Prashant',
      }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 5. Duplicate host name rejection
  await test('Reject duplicate name matching host "Yakshit" (409)', async () => {
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: createdRoomCode,
        playerName: 'Yakshit',
      }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  // 6. Join second player Priya
  await test('Join second player Priya to room', async () => {
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: createdRoomCode,
        playerName: 'Priya',
      }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.data.room.currentPlayers !== 3) {
      throw new Error(`Expected 3 players, got ${res.data.data.room.currentPlayers}`);
    }
  });

  // 7. GET /api/rooms/:roomCode
  await test('Retrieve room via GET /api/rooms/:roomCode', async () => {
    const res = await api(`/rooms/${createdRoomCode}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    const room = res.data.data;
    if (room.roomCode !== createdRoomCode) throw new Error('Room code mismatch');
    if (room.currentPlayers !== 3) throw new Error(`Expected 3 players, got ${room.currentPlayers}`);
    if (room.players.length !== 3) throw new Error(`Expected players array length 3`);
    if (room.maxNumber !== 36) throw new Error(`Expected maxNumber 36, got ${room.maxNumber}`);
    if (room.status !== 'waiting') throw new Error(`Expected status waiting, got ${room.status}`);
  });

  // 8. Success: 5x5 + BINGO
  await test('Create 5x5 room with BINGO', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BINGO',
        callingMode: 'random',
        hostParticipates: true,
        hostName: 'Alice',
      }),
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.data.room.maxNumber !== 25) throw new Error('Expected maxNumber 25');
  });

  // 9. Success: 7x7 + KRISHNA
  await test('Create 7x7 room with KRISHNA', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 7,
        playerLimit: 15,
        winningWord: 'KRISHNA',
        callingMode: 'turn-based',
        hostParticipates: true,
        hostName: 'Arjun',
      }),
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.data.room.maxNumber !== 49) throw new Error('Expected maxNumber 49');
  });

  // 10. Success: 10x10 + 10-letter word
  await test('Create 10x10 room with 10-letter word INVINCIBLE', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 10,
        playerLimit: 30,
        winningWord: 'INVINCIBLE',
        callingMode: 'turn-based',
        hostParticipates: true,
        hostName: 'Neo',
      }),
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.data.room.maxNumber !== 100) throw new Error('Expected maxNumber 100');
  });

  // 11. Invalid: 6x6 + 5-letter word
  await test('Reject 6x6 + 5-letter word (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 6,
        playerLimit: 10,
        winningWord: 'BINGO',
        callingMode: 'turn-based',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 12. Invalid: 6x6 + 7-letter word
  await test('Reject 6x6 + 7-letter word (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 6,
        playerLimit: 10,
        winningWord: 'KRISHNA',
        callingMode: 'turn-based',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 13. Invalid: Winning word with spaces
  await test('Reject winning word with spaces (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BIN GO',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 14. Invalid: Winning word with numbers
  await test('Reject winning word with numbers (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BING1',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 15. Invalid: Winning word with special characters
  await test('Reject winning word with special characters (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'B!NGO',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 16. Invalid: Player limit above 30
  await test('Reject player limit above 30 (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 35,
        winningWord: 'BINGO',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 17. Invalid: Player limit below 5
  await test('Reject player limit below 5 (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 3,
        winningWord: 'BINGO',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 18. Invalid: Grid below 5
  await test('Reject grid below 5 (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 4,
        playerLimit: 5,
        winningWord: 'BING',
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 19. Invalid: Grid above 20
  await test('Reject grid above 20 (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 21,
        playerLimit: 5,
        winningWord: 'A'.repeat(21),
        callingMode: 'random',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 20. Invalid: calling mode
  await test('Reject invalid calling mode (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BINGO',
        callingMode: 'auto-spin',
        hostName: 'Test',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 21. Invalid: Missing host name
  await test('Reject missing host name (400)', async () => {
    const res = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BINGO',
        callingMode: 'random',
        hostName: '   ',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 22. Invalid: Join non-existing room
  await test('Reject join non-existing room (404)', async () => {
    const res = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: 'ZZZZ99',
        playerName: 'Guest',
      }),
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // 23. Invalid: Join full room
  await test('Reject join when room reaches playerLimit (409)', async () => {
    // Create a 5-player room with 1 host
    const createRes = await api('/rooms', {
      method: 'POST',
      body: JSON.stringify({
        gridSize: 5,
        playerLimit: 5,
        winningWord: 'BINGO',
        callingMode: 'random',
        hostParticipates: true,
        hostName: 'HostPlayer',
      }),
    });
    const fullRoomCode = createRes.data.data.roomCode;
    // Join 4 more players to reach limit of 5
    for (let i = 1; i <= 4; i++) {
      const joinRes = await api('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({
          roomCode: fullRoomCode,
          playerName: `Player${i}`,
        }),
      });
      if (joinRes.status !== 200) throw new Error(`Failed adding player ${i}`);
    }
    // Now try 6th player -> should be rejected with 409
    const sixthRes = await api('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({
        roomCode: fullRoomCode,
        playerName: 'Player6',
      }),
    });
    if (sixthRes.status !== 409) {
      throw new Error(`Expected 409 for full room, got ${sixthRes.status}`);
    }
  });

  // 24. Leave room: Player leaves
  await test('Player leaves room (POST /api/rooms/:roomCode/leave)', async () => {
    const res = await api(`/rooms/${createdRoomCode}/leave`, {
      method: 'POST',
      body: JSON.stringify({ playerId: prashantPlayerId }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    
    // Check room player count decreased
    const checkRes = await api(`/rooms/${createdRoomCode}`);
    if (checkRes.data.data.currentPlayers !== 2) {
      throw new Error(`Expected 2 players after leave, got ${checkRes.data.data.currentPlayers}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
