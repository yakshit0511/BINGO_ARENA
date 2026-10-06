/**
 * Bingo Arena - Prompt 8 Automated Test Suite
 * Authoritative Number-Calling Engine, Turn Advancement, Security Validation & Concurrency Protection
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, body: json };
}

function generateSequentialBoard(gridSize) {
  const total = gridSize * gridSize;
  return Array.from({ length: total }, (_, i) => i + 1);
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runPrompt8TestSuite() {
  console.log('\n======================================================================');
  console.log('🎱 BINGO ARENA - PROMPT 8 TEST SUITE: REAL NUMBER-CALLING ENGINE');
  console.log('======================================================================\n');

  // STEP 1: Create Room (5x5, 5 max, BINGO, turn-based, Host participates)
  console.log('▶ [1/12] Creating Room (5x5, BINGO, Host participates)...');
  const createRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      hostName: 'HOST_USER',
      gridSize: 5,
      playerLimit: 5,
      winningWord: 'BINGO',
      callingMode: 'turn-based',
      hostParticipates: true,
    }),
  });

  assert(createRes.status === 201, `Room created with HTTP 201 (got ${createRes.status})`);
  const roomCode = createRes.body.data.roomCode;
  const hostPlayerId = createRes.body.data.playerId;
  console.log(`  Room Code: ${roomCode}, Host Player ID: ${hostPlayerId}`);

  // STEP 2: Join Players A, B, and C
  console.log('\n▶ [2/12] Joining Players A, B, and C...');
  const joinA = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_A' }),
  });
  assert(joinA.status === 200, 'Player A joined successfully');
  const playerAId = joinA.body.data.playerId;

  const joinB = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_B' }),
  });
  assert(joinB.status === 200, 'Player B joined successfully');
  const playerBId = joinB.body.data.playerId;

  const joinC = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_C' }),
  });
  assert(joinC.status === 200, 'Player C joined successfully');
  const playerCId = joinC.body.data.playerId;

  console.log(`  Players: HOST=${hostPlayerId}, A=${playerAId}, B=${playerBId}, C=${playerCId}`);

  // STEP 3: Submit boards for all 4 players
  console.log('\n▶ [3/12] Submitting valid 5x5 boards for all 4 players...');
  const validBoard = generateSequentialBoard(5);
  for (const pid of [hostPlayerId, playerAId, playerBId, playerCId]) {
    const subRes = await request(`/rooms/${roomCode}/players/${pid}/board`, {
      method: 'POST',
      body: JSON.stringify({ cells: validBoard }),
    });
    assert(subRes.status === 200, `Board submitted for player ${pid}`);
  }

  // STEP 4: Configure turn order: C -> A -> HOST -> B
  console.log('\n▶ [4/12] Host configures turn order: C -> A -> HOST -> B...');
  const configuredOrder = [playerCId, playerAId, hostPlayerId, playerBId];
  const orderRes = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: configuredOrder,
    }),
  });
  assert(orderRes.status === 200, 'Turn order configured successfully');

  // STEP 5: Start Game
  console.log('\n▶ [5/12] Host starts game...');
  const startRes = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: configuredOrder,
    }),
  });
  assert(startRes.status === 200, 'Game started successfully');
  const initialGame = startRes.body.data.game;
  assert(initialGame.status === 'active', 'Game status is active');
  assert(initialGame.currentPlayerId === playerCId, 'Initial turn is Player C');
  assert(initialGame.turnNumber === 1, 'Initial turnNumber is 1');
  assert(initialGame.calledNumbers.length === 0, 'No numbers called initially');

  // STEP 6: Security - Player A tries to call when it is C\'s turn -> MUST BE REJECTED
  console.log('\n▶ [6/12] Security Test: Out-of-turn call rejection...');
  const outOfTurn = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerAId,
      number: 17,
    }),
  });
  assert(outOfTurn.status === 403, `Out of turn call rejected with 403 (got ${outOfTurn.status})`);
  assert(
    outOfTurn.body.message.includes('not your turn'),
    `Error message explains out-of-turn: "${outOfTurn.body.message}"`
  );

  // STEP 7: Security - Range validation (0 and 26 for 5x5)
  console.log('\n▶ [7/12] Security Test: Range boundary validations (0 and N^2 + 1 = 26)...');
  const belowRange = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerCId,
      number: 0,
    }),
  });
  assert(belowRange.status === 400, `Number 0 rejected with 400 (got ${belowRange.status})`);

  const aboveRange = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerCId,
      number: 26,
    }),
  });
  assert(aboveRange.status === 400, `Number 26 rejected with 400 (got ${aboveRange.status})`);

  // STEP 8: Valid Call: Turn 1 - C calls 17
  console.log('\n▶ [8/12] Turn 1: Player C calls 17...');
  const call1 = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerCId,
      number: 17,
    }),
  });
  assert(call1.status === 200, `Call 17 succeeded with HTTP 200 (got ${call1.status})`);
  const g1 = call1.body.data.game;
  assert(g1.currentNumber === 17, 'Current number is 17');
  assert(g1.currentCallerName === 'PLAYER_C', 'Caller recorded as PLAYER_C');
  assert(g1.calledNumbers.includes(17), 'calledNumbers contains 17');
  assert(g1.currentPlayerId === playerAId, 'Turn advanced to Player A');
  assert(g1.turnNumber === 2, 'Turn number advanced to 2');
  assert(g1.lastCalledNumbers.length === 1, 'lastCalledNumbers has 1 entry');
  assert(g1.lastCalledNumbers[0].number === 17, 'lastCalledNumbers[0] is 17');
  assert(g1.lastCalledNumbers[0].playerName === 'PLAYER_C', 'lastCalledNumbers[0] caller is PLAYER_C');

  // STEP 9: Security - Player A tries to call 17 (already called) -> MUST BE REJECTED
  console.log('\n▶ [9/12] Security Test: Duplicate number call rejection...');
  const dupCall = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({
      playerId: playerAId,
      number: 17,
    }),
  });
  assert(dupCall.status === 400, `Duplicate number rejected with 400 (got ${dupCall.status})`);
  assert(
    dupCall.body.message.includes('already been called'),
    `Error explains number already called: "${dupCall.body.message}"`
  );

  // STEP 10: Turn Progression through entire rotation (C -> A -> HOST -> B -> C)
  console.log('\n▶ [10/12] Full Rotation Sequence Execution:');

  // Turn 2: A calls 8
  console.log('   Turn 2: Player A calls 8...');
  const call2 = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId, number: 8 }),
  });
  assert(call2.status === 200, 'Player A calls 8');
  assert(call2.body.data.game.currentPlayerId === hostPlayerId, 'Turn advanced to HOST');
  assert(call2.body.data.game.currentNumber === 8, 'Current number is 8');

  // Turn 3: HOST calls 23
  console.log('   Turn 3: HOST calls 23...');
  const call3 = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId, number: 23 }),
  });
  assert(call3.status === 200, 'HOST calls 23');
  assert(call3.body.data.game.currentPlayerId === playerBId, 'Turn advanced to Player B');
  assert(call3.body.data.game.currentNumber === 23, 'Current number is 23');

  // Turn 4: B calls 5
  console.log('   Turn 4: Player B calls 5...');
  const call4 = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerBId, number: 5 }),
  });
  assert(call4.status === 200, 'Player B calls 5');
  assert(call4.body.data.game.currentPlayerId === playerCId, 'Turn cycled back to Player C!');
  assert(call4.body.data.game.currentNumber === 5, 'Current number is 5');

  // Turn 5: C calls 12
  console.log('   Turn 5: Player C calls 12...');
  const call5 = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerCId, number: 12 }),
  });
  assert(call5.status === 200, 'Player C calls 12');
  assert(call5.body.data.game.currentPlayerId === playerAId, 'Turn advanced to Player A');
  assert(call5.body.data.game.currentNumber === 12, 'Current number is 12');

  // Verify Last 5 Calls Roster
  const g5 = call5.body.data.game;
  console.log('\n   Verifying Last 5 Calls History:');
  assert(g5.lastCalledNumbers.length === 5, `Exactly 5 entries in lastCalledNumbers (got ${g5.lastCalledNumbers.length})`);
  assert(g5.lastCalledNumbers[0].number === 12 && g5.lastCalledNumbers[0].playerName === 'PLAYER_C', 'Latest call is #12 by PLAYER_C');
  assert(g5.lastCalledNumbers[1].number === 5 && g5.lastCalledNumbers[1].playerName === 'PLAYER_B', 'Second latest is #5 by PLAYER_B');
  assert(g5.lastCalledNumbers[2].number === 23 && g5.lastCalledNumbers[2].playerName === 'HOST_USER', 'Third is #23 by HOST_USER');
  assert(g5.lastCalledNumbers[3].number === 8 && g5.lastCalledNumbers[3].playerName === 'PLAYER_A', 'Fourth is #8 by PLAYER_A');
  assert(g5.lastCalledNumbers[4].number === 17 && g5.lastCalledNumbers[4].playerName === 'PLAYER_C', 'Fifth is #17 by PLAYER_C');

  // STEP 11: Execute additional turns (up to 12 total turns) to verify stability
  console.log('\n▶ [11/12] Extended Turns Execution (Testing turns 6 to 12)...');
  const turnsPlan = [
    { pid: playerAId, num: 1 },
    { pid: hostPlayerId, num: 2 },
    { pid: playerBId, num: 3 },
    { pid: playerCId, num: 4 },
    { pid: playerAId, num: 6 },
    { pid: hostPlayerId, num: 7 },
    { pid: playerBId, num: 9 },
  ];

  for (let i = 0; i < turnsPlan.length; i++) {
    const { pid, num } = turnsPlan[i];
    const turnRes = await request(`/rooms/${roomCode}/game/call-number`, {
      method: 'POST',
      body: JSON.stringify({ playerId: pid, number: num }),
    });
    assert(turnRes.status === 200, `Turn ${i + 6}: Called number ${num} successfully`);
  }

  // STEP 12: Reconnection & State Recovery verification
  console.log('\n▶ [12/12] Reconnection & State Synchronization Verification...');
  const stateRes = await request(`/rooms/${roomCode}`);
  assert(stateRes.status === 200, 'Fetched room state successfully');
  const fetchedGame = stateRes.body.data.game;
  assert(fetchedGame.status === 'active', 'Game remains active');
  assert(fetchedGame.calledNumbers.length === 12, `Total 12 numbers called (got ${fetchedGame.calledNumbers.length})`);
  assert(fetchedGame.currentNumber === 9, 'Current number matches latest call (9)');
  assert(fetchedGame.lastCalledNumbers.length === 5, 'Last 5 calls capped at 5');
  assert(fetchedGame.lastCalledNumbers[0].number === 9, 'Latest in last 5 is 9');
  assert(new Set(fetchedGame.calledNumbers).size === 12, 'Zero duplicate numbers in calledNumbers set');

  console.log('\n=============================================================');
  console.log('🎉 ALL PROMPT 8 AUTOMATED TESTS PASSED WITH 100% SUCCESS!');
  console.log('=============================================================\n');
}

runPrompt8TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
