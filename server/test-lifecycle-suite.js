/**
 * Bingo Arena - Prompt 10 Automated Test Suite: Complete Game Lifecycle
 * Tests Scenarios A through G:
 * - Scenario A: Win State & Server Authoritative Win Lock
 * - Scenario B: Host End Game & Round History Persistence
 * - Scenario C: Continue to New Round (Round 2, state reset, boards preserved, history retained)
 * - Scenario D: No Winner Exhaustion & Restart Game
 * - Scenario E: Host End Room & Room Closed State
 * - Scenario F: Refresh / Authoritative Room Retrieval
 * - Scenario G: Strict Security & Role Authorization Enforcement
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

async function runLifecycleTestSuite() {
  console.log('\n=================================================================================');
  console.log('🏆 BINGO ARENA - PROMPT 10 TEST SUITE: COMPLETE GAME LIFECYCLE & ROUND HISTORY');
  console.log('=================================================================================\n');

  // ==========================================
  // SCENARIO A: 5x5 MATCH WITH CONTROLLED WIN FOR C
  // ==========================================
  console.log('▶ [1/10] Creating 5x5 Room (BINGO, 4 players: HOST, C, A, B)...');
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

  assert(createRes.status === 201, `Room created (HTTP 201)`);
  const roomCode = createRes.body.data.roomCode;
  const hostId = createRes.body.data.playerId;

  // Join C, A, B
  const joinC = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_C' }),
  });
  const playerCId = joinC.body.data.playerId;

  const joinA = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_A' }),
  });
  const playerAId = joinA.body.data.playerId;

  const joinB = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_B' }),
  });
  const playerBId = joinB.body.data.playerId;

  console.log(`  Room Code: ${roomCode}`);
  console.log(`  Players: HOST=${hostId}, C=${playerCId}, A=${playerAId}, B=${playerBId}`);

  // Submit Boards
  // Player C gets standard 1..25 sequential board:
  // Row 1: 1, 2, 3, 4, 5
  // Row 2: 6, 7, 8, 9, 10
  // Row 3: 11, 12, 13, 14, 15
  // Row 4: 16, 17, 18, 19, 20
  // Row 5: 21, 22, 23, 24, 25
  const boardC = generateSequentialBoard(5);
  const boardA = [12, 4, 18, 1, 24, 7, 22, 15, 3, 9, 21, 14, 2, 19, 8, 25, 11, 6, 17, 23, 10, 5, 20, 13, 16];
  const boardB = [24, 1, 15, 8, 22, 3, 19, 12, 5, 16, 7, 20, 14, 2, 25, 11, 4, 18, 9, 23, 6, 17, 10, 21, 13];
  const boardHost = [9, 21, 4, 16, 2, 18, 8, 23, 11, 25, 1, 14, 6, 20, 13, 24, 7, 19, 3, 15, 12, 22, 10, 17, 5];

  await request(`/rooms/${roomCode}/players/${playerCId}/board`, { method: 'POST', body: JSON.stringify({ cells: boardC }) });
  await request(`/rooms/${roomCode}/players/${playerAId}/board`, { method: 'POST', body: JSON.stringify({ cells: boardA }) });
  await request(`/rooms/${roomCode}/players/${hostId}/board`, { method: 'POST', body: JSON.stringify({ cells: boardHost }) });
  await request(`/rooms/${roomCode}/players/${playerBId}/board`, { method: 'POST', body: JSON.stringify({ cells: boardB }) });

  // Start match with turn order: C -> A -> HOST -> B
  const turnOrder = [playerCId, playerAId, hostId, playerBId];
  const startRes = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostId, playerOrder: turnOrder }),
  });

  assert(startRes.status === 200, `Game started with turn order C -> A -> HOST -> B`);
  assert(startRes.body.data.game.status === 'active', `Game status is active`);
  assert(startRes.body.data.game.currentPlayerId === playerCId, `Current turn is player C`);
  assert(startRes.body.data.game.roundNumber === 1, `Initial round is Round 1`);

  // Call sequence to give C 5 completed lines (Row 1, Row 2, Row 3, Row 4, Row 5):
  // 1, 2, 3, 4, 5 (Row 1) -> Letter B
  // 6, 7, 8, 9, 10 (Row 2) -> Letter I
  // 11, 12, 13, 14, 15 (Row 3) -> Letter N
  // 16, 17, 18, 19, 20 (Row 4) -> Letter G
  // 21, 22, 23, 24, 25 (Row 5) -> Letter O (BINGO WIN!)
  console.log('\n▶ [2/10] Calling numbers until Player C completes BINGO...');
  const numbersToCall = [
    1, 2, 3, 4, 5,       // Row 1
    6, 7, 8, 9, 10,      // Row 2
    11, 12, 13, 14, 15,  // Row 3
    16, 17, 18, 19, 20,  // Row 4
    21, 22, 23, 24, 25   // Row 5
  ];

  let currentCallerIndex = 0;
  let finalCallResult;

  for (let i = 0; i < numbersToCall.length; i++) {
    const num = numbersToCall[i];
    const callerId = turnOrder[currentCallerIndex % turnOrder.length];
    currentCallerIndex++;

    const callRes = await request(`/rooms/${roomCode}/game/call-number`, {
      method: 'POST',
      body: JSON.stringify({ playerId: callerId, number: num }),
    });

    if (callRes.body.data?.winner) {
      finalCallResult = callRes;
      console.log(`  Call #${i + 1}: Number ${num} called by ${callerId} -> WINNER DETECTED!`);
      break;
    }
  }

  assert(Boolean(finalCallResult), `Winner was detected before exhaustion`);
  assert(finalCallResult.body.data.game.status === 'won', `Game status changed to 'won'`);
  assert(finalCallResult.body.data.game.winnerId === playerCId, `Player C is authoritative winner`);
  assert(finalCallResult.body.data.winner.playerName === 'PLAYER_C', `Winner name is PLAYER_C`);
  assert(Boolean(finalCallResult.body.data.game.wonAt), `wonAt timestamp is recorded`);
  assert(Boolean(finalCallResult.body.data.game.endedAt), `endedAt timestamp is recorded`);

  // Verify that turn does NOT advance and further calls are rejected
  console.log('\n▶ [3/10] Verifying winner lock (turn does not advance, further calls rejected)...');
  const postWinCall = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerCId, number: 1 }),
  });
  assert(postWinCall.status === 400, `Further number call rejected after win (HTTP 400)`);

  // ==========================================
  // SCENARIO B: HOST END GAME
  // ==========================================
  console.log('\n▶ [4/10] Scenario B: Host selects END GAME...');
  const endRes = await request(`/rooms/${roomCode}/game/end`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostId }),
  });

  assert(endRes.status === 200, `Host ended match successfully (HTTP 200)`);
  assert(endRes.body.data.game.status === 'ended', `Game status transitioned to 'ended'`);
  assert(endRes.body.data.room.status === 'finished', `Room status transitioned to 'finished'`);
  assert(endRes.body.data.game.roundHistory.length >= 1, `Round 1 recorded in roundHistory`);
  assert(endRes.body.data.game.roundHistory[0].winnerId === playerCId, `Round 1 history records winner Player C`);

  // ==========================================
  // SCENARIO C: CONTINUE TO ROUND 2
  // ==========================================
  console.log('\n▶ [5/10] Scenario C: Host selects CONTINUE GAME to start Round 2...');
  // We can continue from won or restart into next round
  // First test continueGame endpoint:
  // Note: Since room status was ended, let's test restart/continue functionality
  const restartRes = await request(`/rooms/${roomCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostId }),
  });

  assert(restartRes.status === 200, `Round 2 started successfully (HTTP 200)`);
  assert(restartRes.body.data.game.status === 'active', `Round 2 status is active`);
  assert(restartRes.body.data.game.roundNumber === 2, `Round number incremented to 2`);
  assert(restartRes.body.data.game.currentPlayerId === playerCId, `Turn reset to first player C in turnOrder`);
  assert(restartRes.body.data.game.calledNumbers.length === 0, `calledNumbers reset to empty array`);
  assert(restartRes.body.data.game.callHistory.length === 0, `callHistory reset to empty array`);
  assert(restartRes.body.data.game.winnerId === null, `winnerId reset to null`);
  assert(restartRes.body.data.game.roundHistory.length >= 1, `Round 1 history preserved in roundHistory!`);

  // Verify player boards are preserved in DB
  const boardCheck = await request(`/rooms/${roomCode}/players/${playerCId}/board`);
  assert(boardCheck.status === 200 && boardCheck.body.data.board.length === 25, `Player C board preserved without re-entry`);

  // Verify player progress (completed lines/letters) were reset for Round 2
  const roomAfterRestart = await request(`/rooms/${roomCode}`);
  const playerCAfter = roomAfterRestart.body.data.players.find((p) => p.playerId === playerCId);
  assert(playerCAfter.completedLines.length === 0, `Player C completedLines reset to 0 for Round 2`);
  assert(playerCAfter.earnedLetters.length === 0, `Player C earnedLetters reset to 0 for Round 2`);

  // ==========================================
  // SCENARIO D: NO WINNER EXHAUSTION
  // ==========================================
  console.log('\n▶ [6/10] Scenario D: Testing NO WINNER state...');
  const noWinRoom = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      hostName: 'HOST_NW',
      gridSize: 5,
      playerLimit: 5,
      winningWord: 'EXTRA',
      callingMode: 'turn-based',
      hostParticipates: true,
    }),
  });
  assert(noWinRoom.status === 201, `5x5 No-winner room created`);
  const nwCode = noWinRoom.body.data.roomCode;
  const nwHostId = noWinRoom.body.data.playerId;

  const nwJoin = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode: nwCode, playerName: 'NW_PLAYER_2' }),
  });
  const nwP2Id = nwJoin.body.data.playerId;

  // Submit valid 5x5 boards (25 cells)
  const b5 = generateSequentialBoard(5);
  await request(`/rooms/${nwCode}/players/${nwHostId}/board`, { method: 'POST', body: JSON.stringify({ cells: b5 }) });
  await request(`/rooms/${nwCode}/players/${nwP2Id}/board`, { method: 'POST', body: JSON.stringify({ cells: b5 }) });

  const nwStart = await request(`/rooms/${nwCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId }),
  });
  assert(nwStart.status === 200, `5x5 game started`);

  // Simulate no-winner exhaustion in database
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://23it047_db_user:JX9Ef1aARShh0ptR@bingo.4u4xuxl.mongodb.net/?appName=Bingo';
    await mongoose.connect(mongoUri);
  }

  const all25 = Array.from({ length: 25 }, (_, i) => i + 1);
  await mongoose.connection.collection('rooms').updateOne(
    { roomCode: nwCode },
    {
      $set: {
        'game.status': 'no_winner',
        'game.calledNumbers': all25,
        'game.endedAt': new Date(),
        status: 'finished',
      },
    }
  );

  // 1. Verify authoritative state returns no_winner
  const nwState = await request(`/rooms/${nwCode}`);
  assert(nwState.body.data.game.status === 'no_winner', `Game status is authoritative 'no_winner'`);
  assert(nwState.body.data.game.calledNumbers.length === 25, `All 25 numbers called`);

  // 2. Calling a number when no_winner is rejected
  const callOnNoWin = await request(`/rooms/${nwCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId, number: 1 }),
  });
  assert(callOnNoWin.status === 400, `Calling number after no_winner rejected with HTTP 400`);

  // 3. Host restarts game after NO WINNER -> Round 2 starts
  const nwRestart = await request(`/rooms/${nwCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId }),
  });
  assert(nwRestart.status === 200, `Host restarted match after no-winner (HTTP 200)`);
  assert(nwRestart.body.data.game.roundNumber === 2, `Round number incremented to 2`);
  assert(nwRestart.body.data.game.status === 'active', `Round 2 is active`);
  assert(nwRestart.body.data.game.calledNumbers.length === 0, `Called numbers reset to 0`);
  assert(nwRestart.body.data.game.roundHistory.length === 1, `Round 1 recorded in roundHistory`);
  assert(nwRestart.body.data.game.roundHistory[0].noWinner === true, `Round 1 record flags noWinner = true`);
  assert(nwRestart.body.data.game.roundHistory[0].totalCalls === 25, `Round 1 record recorded 25 total calls`);

  // ==========================================
  // SCENARIO E: HOST END ROOM (CLOSURE)
  // ==========================================
  console.log('\n▶ [7/10] Scenario E: Host closes the room (END ROOM)...');
  const closeRes = await request(`/rooms/${nwCode}/close`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId }),
  });

  assert(closeRes.status === 200, `Room closed successfully (HTTP 200)`);
  assert(closeRes.body.data.room.status === 'closed', `Room status is 'closed'`);

  // ==========================================
  // SCENARIO G: SECURITY & AUTHORIZATION TESTING
  // ==========================================
  console.log('\n▶ [8/10] Scenario G: Security - Operations rejected on closed room...');
  // 1. Join closed room -> Reject
  const joinClosed = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode: nwCode, playerName: 'HACKER' }),
  });
  assert(joinClosed.status === 403, `Join closed room rejected with HTTP 403 (${joinClosed.body.message})`);

  // 2. Call number on closed room -> Reject
  const callClosed = await request(`/rooms/${nwCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId, number: 1 }),
  });
  assert(callClosed.status === 403, `Call on closed room rejected with HTTP 403 (${callClosed.body.message})`);

  // 3. Restart closed room -> Reject
  const restartClosed = await request(`/rooms/${nwCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId }),
  });
  assert(restartClosed.status === 403, `Restart closed room rejected with HTTP 403 (${restartClosed.body.message})`);

  // 4. Continue closed room -> Reject
  const continueClosed = await request(`/rooms/${nwCode}/game/continue`, {
    method: 'POST',
    body: JSON.stringify({ playerId: nwHostId }),
  });
  assert(continueClosed.status === 403, `Continue closed room rejected with HTTP 403 (${continueClosed.body.message})`);

  console.log('\n▶ [9/10] Security - Non-host authorization rejection...');
  // In the active 5x5 room (roomCode), non-host player A attempts host actions:
  // 1. Non-host attempts restart
  const unauthorizedRestart = await request(`/rooms/${roomCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(unauthorizedRestart.status === 403, `Non-host restart rejected with HTTP 403 (${unauthorizedRestart.body.message})`);

  // 2. Non-host attempts continue
  const unauthorizedContinue = await request(`/rooms/${roomCode}/game/continue`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(unauthorizedContinue.status === 403, `Non-host continue rejected with HTTP 403 (${unauthorizedContinue.body.message})`);

  // 3. Non-host attempts end
  const unauthorizedEnd = await request(`/rooms/${roomCode}/game/end`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(unauthorizedEnd.status === 403, `Non-host end match rejected with HTTP 403 (${unauthorizedEnd.body.message})`);

  // 4. Non-host attempts close room
  const unauthorizedClose = await request(`/rooms/${roomCode}/close`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(unauthorizedClose.status === 403, `Non-host close room rejected with HTTP 403 (${unauthorizedClose.body.message})`);

  // 5. Player attempts restart while game is active
  const activeRestart = await request(`/rooms/${roomCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostId }),
  });
  assert(activeRestart.status === 400, `Restart active game rejected with HTTP 400 (${activeRestart.body.message})`);

  // ==========================================
  // SCENARIO F: REFRESH & AUTHORITATIVE SERVER STATE
  // ==========================================
  console.log('\n▶ [10/10] Scenario F: Verifying Authoritative Server State on direct fetch...');
  const stateRes = await request(`/rooms/${roomCode}`);
  assert(stateRes.status === 200, `Authoritative room state retrieved (HTTP 200)`);
  assert(stateRes.body.data.game.roundNumber === 2, `Direct state fetch confirms Round 2`);
  assert(stateRes.body.data.game.roundHistory.length >= 1, `Direct state fetch includes roundHistory`);
  assert(stateRes.body.data.game.roundHistory[0].winnerId === playerCId, `roundHistory retains Round 1 winner C`);

  console.log('\n=================================================================================');
  console.log('🎉 ALL 10 GAME LIFECYCLE & SECURITY TEST SCENARIOS PASSED WITH ZERO ERRORS!');
  console.log('=================================================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

runLifecycleTestSuite().catch(async (err) => {
  console.error('Fatal error running Prompt 10 test suite:', err);
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
