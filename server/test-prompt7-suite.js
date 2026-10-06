/**
 * Bingo Arena - Prompt 7 Automated Test Suite
 * Turn Order Configuration + Authoritative Game Start Engine
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

async function runPrompt7TestSuite() {
  console.log('\n=============================================================');
  console.log('🎮 BINGO ARENA - PROMPT 7 TEST SUITE: TURN ORDER & GAME START');
  console.log('=============================================================\n');

  // TEST 1: Create a Room
  console.log('▶ [1/12] Creating Room (5x5, 5 max, Host participates)...');
  const createRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      hostName: 'Host_Yakshit',
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

  // TEST 2: Join Players A, B, C
  console.log('\n▶ [2/12] Joining Players A, B, and C...');
  const joinA = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'Player_A' }),
  });
  assert(joinA.status === 200, `Player A joined (HTTP 200)`);
  const playerAId = joinA.body.data.playerId;

  const joinB = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'Player_B' }),
  });
  assert(joinB.status === 200, `Player B joined (HTTP 200)`);
  const playerBId = joinB.body.data.playerId;

  const joinC = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'Player_C' }),
  });
  assert(joinC.status === 200, `Player C joined (HTTP 200)`);
  const playerCId = joinC.body.data.playerId;

  console.log(`  Participants: Host=${hostPlayerId}, A=${playerAId}, B=${playerBId}, C=${playerCId}`);

  // TEST 3: Attempt start before boards are submitted -> MUST BE REJECTED
  console.log('\n▶ [3/12] Security Check: Host attempts to start game BEFORE boards are submitted...');
  const earlyStart = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId }),
  });
  assert(earlyStart.status === 400, `Premature game start rejected with 400 (got ${earlyStart.status})`);
  assert(
    earlyStart.body.message && earlyStart.body.message.includes('submit their boards'),
    `Rejection message states all players must submit: "${earlyStart.body.message}"`
  );

  // TEST 4: Submit boards for all 4 players
  console.log('\n▶ [4/12] Submitting valid 5x5 boards for all 4 players...');
  const validBoard = generateSequentialBoard(5);

  const subHost = await request(`/rooms/${roomCode}/players/${hostPlayerId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: validBoard }),
  });
  assert(subHost.status === 200, 'Host board submitted successfully');

  const subA = await request(`/rooms/${roomCode}/players/${playerAId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: validBoard }),
  });
  assert(subA.status === 200, 'Player A board submitted successfully');

  const subB = await request(`/rooms/${roomCode}/players/${playerBId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: validBoard }),
  });
  assert(subB.status === 200, 'Player B board submitted successfully');

  const subC = await request(`/rooms/${roomCode}/players/${playerCId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: validBoard }),
  });
  assert(subC.status === 200, 'Player C board submitted successfully');
  assert(subC.body.data.room.allSubmitted === true, 'All players marked allSubmitted=true');

  // TEST 5: Non-host attempts to configure turn order -> MUST BE REJECTED
  console.log('\n▶ [5/12] Security Check: Non-host (Player A) attempts to configure turn order...');
  const nonHostOrder = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: playerAId,
      playerOrder: [playerCId, playerAId, hostPlayerId, playerBId],
    }),
  });
  assert(nonHostOrder.status === 403, `Non-host turn order configuration rejected with 403 (got ${nonHostOrder.status})`);

  // TEST 6: Invalid turn order submissions by Host
  console.log('\n▶ [6/12] Turn Order Validation Checks...');
  
  // 6a: Duplicate player in order
  const dupOrder = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: [playerCId, playerAId, playerCId, playerBId],
    }),
  });
  assert(dupOrder.status === 400, `Duplicate player in turn order rejected with 400`);

  // 6b: Missing player in order
  const missingOrder = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: [playerCId, playerAId, playerBId], // missing host
    }),
  });
  assert(missingOrder.status === 400, `Missing player in turn order rejected with 400`);

  // 6c: Unknown player ID
  const unknownOrder = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: [playerCId, playerAId, hostPlayerId, 'unknown_123'],
    }),
  });
  assert(unknownOrder.status === 400, `Unknown player ID in turn order rejected with 400`);

  // TEST 7: Host sets valid custom turn order: C -> A -> Host -> B
  console.log('\n▶ [7/12] Host sets valid turn order: C -> A -> Host -> B...');
  const targetOrder = [playerCId, playerAId, hostPlayerId, playerBId];
  const setOrderRes = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: targetOrder,
    }),
  });
  assert(setOrderRes.status === 200, `Turn order saved successfully (HTTP 200)`);
  assert(
    JSON.stringify(setOrderRes.body.data.turnOrder) === JSON.stringify(targetOrder),
    `Saved turn order matches [C, A, Host, B]`
  );

  // TEST 8: Non-host attempts to start game -> MUST BE REJECTED
  console.log('\n▶ [8/12] Security Check: Non-host (Player B) attempts to start game...');
  const nonHostStart = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerBId }),
  });
  assert(nonHostStart.status === 403, `Non-host start game rejected with 403 (got ${nonHostStart.status})`);

  // TEST 9: Host starts game authoritatively
  console.log('\n▶ [9/12] Host starts game authoritatively...');
  const startRes = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId }),
  });
  assert(startRes.status === 200, `Game started with HTTP 200 (got ${startRes.status})`);
  const roomData = startRes.body.data.room;
  const gameData = startRes.body.data.game;

  // Validate state
  assert(roomData.status === 'playing', `Room status is 'playing'`);
  assert(gameData.status === 'active', `Game status is 'active'`);
  assert(gameData.currentTurnIndex === 0, `currentTurnIndex is 0`);
  assert(gameData.currentPlayerId === playerCId, `First player is Player C (id: ${playerCId})`);
  assert(gameData.turnNumber === 1, `turnNumber is 1`);
  assert(Array.isArray(gameData.calledNumbers) && gameData.calledNumbers.length === 0, `NO number called at start (calledNumbers is [])`);
  assert(gameData.winnerId === null, `winnerId is null`);
  assert(gameData.startedAt !== null, `startedAt timestamp is set`);
  assert(
    JSON.stringify(gameData.gamePlayers) === JSON.stringify(targetOrder),
    `gamePlayers is frozen to [C, A, Host, B]`
  );
  assert(
    JSON.stringify(gameData.playerOrder) === JSON.stringify(targetOrder),
    `playerOrder is [C, A, Host, B]`
  );

  // TEST 10: Double start & post-start modifications -> MUST BE REJECTED
  console.log('\n▶ [10/12] Post-Game-Start Security Checks...');
  const doubleStart = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId }),
  });
  assert(doubleStart.status === 409, `Double game start rejected with 409 Conflict`);

  const changeOrderAfterStart = await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({
      playerId: hostPlayerId,
      playerOrder: [playerAId, playerCId, hostPlayerId, playerBId],
    }),
  });
  assert(changeOrderAfterStart.status === 409, `Modifying turn order after start rejected with 409 Conflict`);

  // TEST 11: Late Join Protection -> MUST BE REJECTED
  console.log('\n▶ [11/12] Late Join Protection Check...');
  const lateJoin = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'Player_Latecomer' }),
  });
  assert(lateJoin.status === 409, `Late join rejected with 409 (got ${lateJoin.status})`);
  assert(
    lateJoin.body.message === 'Game already started. You cannot join this room.',
    `Late join returns exact error message: "${lateJoin.body.message}"`
  );

  // TEST 12: Turn Progression Foundation Check (advanceTurn helper)
  console.log('\n▶ [12/12] Turn Progression Helper: advanceTurn circular rotation...');
  // 1st advance: C -> A
  const adv1 = await request(`/rooms/${roomCode}/game/advance-turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerCId }),
  });
  assert(adv1.status === 200, `advanceTurn 1 succeeded`);
  assert(adv1.body.data.game.currentPlayerId === playerAId, `Turn advanced from C to A`);
  assert(adv1.body.data.game.currentTurnIndex === 1, `currentTurnIndex is 1`);
  assert(adv1.body.data.game.turnNumber === 2, `turnNumber is 2`);

  // 2nd advance: A -> Host
  const adv2 = await request(`/rooms/${roomCode}/game/advance-turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(adv2.status === 200, `advanceTurn 2 succeeded`);
  assert(adv2.body.data.game.currentPlayerId === hostPlayerId, `Turn advanced from A to Host`);
  assert(adv2.body.data.game.currentTurnIndex === 2, `currentTurnIndex is 2`);

  // 3rd advance: Host -> B
  const adv3 = await request(`/rooms/${roomCode}/game/advance-turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId }),
  });
  assert(adv3.status === 200, `advanceTurn 3 succeeded`);
  assert(adv3.body.data.game.currentPlayerId === playerBId, `Turn advanced from Host to B`);
  assert(adv3.body.data.game.currentTurnIndex === 3, `currentTurnIndex is 3`);

  // 4th advance: B -> C (wrap around circular rotation)
  const adv4 = await request(`/rooms/${roomCode}/game/advance-turn`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerBId }),
  });
  assert(adv4.status === 200, `advanceTurn 4 (wrap around) succeeded`);
  assert(adv4.body.data.game.currentPlayerId === playerCId, `Turn wrapped around circularly from B back to C`);
  assert(adv4.body.data.game.currentTurnIndex === 0, `currentTurnIndex reset to 0`);
  assert(adv4.body.data.game.turnNumber === 5, `turnNumber is 5`);

  console.log('\n=============================================================');
  console.log('🎉 ALL 12 TEST SUITE CHECKS PASSED WITH 100% SUCCESS!');
  console.log('=============================================================\n');
}

runPrompt7TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
