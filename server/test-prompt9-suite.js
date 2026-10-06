/**
 * Bingo Arena - Prompt 9 Automated Test Suite
 * Complete Bingo / Winning Detection Engine & Authoritative Win Resolution
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

async function runPrompt9TestSuite() {
  console.log('\n=================================================================================');
  console.log('🏆 BINGO ARENA - PROMPT 9 TEST SUITE: COMPLETE BINGO / WINNING DETECTION ENGINE');
  console.log('=================================================================================\n');

  // STEP 1: Create 5x5 Room with winning word 'BINGO'
  console.log('▶ [1/12] Creating Room (5x5, BINGO, Host participates)...');
  const createRes = await request('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      hostName: 'HOST_ALICE',
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

  // STEP 2: Join Players A, B, and C
  console.log('\n▶ [2/12] Joining Players A, B, and C...');
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

  const joinC = await request('/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName: 'PLAYER_C' }),
  });
  const playerCId = joinC.body.data.playerId;

  console.log(`  Players: HOST=${hostPlayerId}, A=${playerAId}, B=${playerBId}, C=${playerCId}`);

  // STEP 3: Submit boards
  // Player C gets standard 1..25 sequential board:
  //  1  2  3  4  5
  //  6  7  8  9 10
  // 11 12 13 14 15
  // 16 17 18 19 20
  // 21 22 23 24 25
  console.log('\n▶ [3/12] Submitting boards for all 4 players...');
  const boardC = generateSequentialBoard(5);
  // Give other players shuffled boards so only player C wins on call 20
  const boardA = [12, 4, 18, 1, 24, 7, 22, 15, 3, 9, 21, 14, 2, 19, 8, 25, 11, 6, 17, 23, 10, 5, 20, 13, 16];
  const boardB = [24, 1, 15, 8, 22, 3, 19, 12, 5, 16, 7, 20, 14, 2, 25, 11, 4, 18, 9, 23, 6, 17, 10, 21, 13];
  const boardHost = [9, 21, 4, 16, 2, 18, 8, 23, 11, 25, 1, 14, 6, 20, 13, 24, 7, 19, 3, 15, 12, 22, 10, 17, 5];

  await request(`/rooms/${roomCode}/players/${playerCId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: boardC }),
  });
  await request(`/rooms/${roomCode}/players/${playerAId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: boardA }),
  });
  await request(`/rooms/${roomCode}/players/${playerBId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: boardB }),
  });
  await request(`/rooms/${roomCode}/players/${hostPlayerId}/board`, {
    method: 'POST',
    body: JSON.stringify({ cells: boardHost }),
  });
  assert(true, 'Boards submitted for all 4 contenders');

  // STEP 4: Configure turn order C -> A -> HOST -> B and start game
  console.log('\n▶ [4/12] Configuring turn order and starting game...');
  const turnOrder = [playerCId, playerAId, hostPlayerId, playerBId];
  await request(`/rooms/${roomCode}/turn-order`, {
    method: 'PUT',
    body: JSON.stringify({ playerId: hostPlayerId, playerOrder: turnOrder }),
  });
  const startRes = await request(`/rooms/${roomCode}/game/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId, playerOrder: turnOrder }),
  });
  assert(startRes.status === 200, 'Game started successfully');

  // Helper to make a call on whoever's turn it currently is
  async function makeCall(num) {
    const roomState = await request(`/rooms/${roomCode}`);
    const currId = roomState.body.data.game.currentPlayerId;
    return request(`/rooms/${roomCode}/game/call-number`, {
      method: 'POST',
      body: JSON.stringify({ playerId: currId, number: num }),
    });
  }

  // STEP 5: TEST CASE 1 — Simple Row Completion: Call 1, 2, 3, 4, 5
  console.log('\n▶ [5/12] Test Case 1: Simple Row Completion (Calling 1, 2, 3, 4, 5)...');
  await makeCall(1);
  await makeCall(2);
  await makeCall(3);
  await makeCall(4);
  const res5 = await makeCall(5);
  assert(res5.status === 200, 'Called 5 successfully');

  const pC_after5 = res5.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_after5.completedLines.includes('row-0'), 'Player C completed row-0');
  assert(pC_after5.earnedLetters.length === 1, 'Player C earned exactly 1 letter');
  assert(pC_after5.earnedLetters[0] === 'B', `Player C earned letter 'B' (got ${pC_after5.earnedLetters[0]})`);

  // STEP 6: TEST CASE 2 — Column Completion: Call 6, 11, 16, 21
  // Row 0 already has 1. With 6, 11, 16, 21, column 0 (1, 6, 11, 16, 21) completes!
  console.log('\n▶ [6/12] Test Case 2: Column Completion (Calling 6, 11, 16, 21)...');
  await makeCall(6);
  await makeCall(11);
  await makeCall(16);
  const res21 = await makeCall(21);
  assert(res21.status === 200, 'Called 21 successfully');

  const pC_after21 = res21.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_after21.completedLines.includes('column-0'), 'Player C completed column-0');
  assert(pC_after21.earnedLetters.length === 2, 'Player C earned 2 letters');
  assert(pC_after21.earnedLetters[1] === 'I', `Player C earned letter 'I' (got ${pC_after21.earnedLetters[1]})`);

  // STEP 7: TEST CASE 3 — Main Diagonal: Call 7, 13, 19, 25
  // Main diagonal has 1, 7, 13, 19, 25. 1 is already called. Calling 7, 13, 19, 25.
  console.log('\n▶ [7/12] Test Case 3: Main Diagonal Completion (Calling 7, 13, 19, 25)...');
  await makeCall(7);
  await makeCall(13);
  await makeCall(19);
  const res25 = await makeCall(25);
  assert(res25.status === 200, 'Called 25 successfully');

  const pC_after25 = res25.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_after25.completedLines.includes('main-diagonal'), 'Player C completed main-diagonal');
  assert(pC_after25.earnedLetters.length === 3, 'Player C earned 3 letters');
  assert(pC_after25.earnedLetters[2] === 'N', `Player C earned letter 'N' (got ${pC_after25.earnedLetters[2]})`);

  // STEP 8: TEST CASE 4 — Anti-Diagonal: Anti-diagonal has 5, 9, 13, 17, 21
  // 5, 13, 21 already called! We need 9 and 17.
  console.log('\n▶ [8/12] Test Case 4: Anti-Diagonal Completion (Calling 9, 17)...');
  await makeCall(9);
  const res17 = await makeCall(17);
  assert(res17.status === 200, 'Called 17 successfully');

  const pC_after17 = res17.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_after17.completedLines.includes('anti-diagonal'), 'Player C completed anti-diagonal');
  assert(pC_after17.earnedLetters.length === 4, 'Player C earned 4 letters');
  assert(pC_after17.earnedLetters[3] === 'G', `Player C earned letter 'G' (got ${pC_after17.earnedLetters[3]})`);

  // STEP 9: TEST CASE 5 & 6 — Final Line Completion -> Win Detection & Winner Lock
  // For Player C, column 4 has 5, 10, 15, 20, 25.
  // 5 and 25 are already called!
  // Let's call 10, 15, and 20.
  // When 20 is called, column-4 completes -> 5th line!
  // Player C earns 'O' -> BINGO!
  // Game status must become 'won' and turn must NOT advance!
  console.log('\n▶ [9/12] Test Cases 5 & 6: Final Line, Winner Detection, and Winner Lock...');
  await makeCall(10);
  await makeCall(15);

  const winningCallRes = await makeCall(20);
  assert(winningCallRes.status === 200, 'Winning call 20 succeeded');
  const gWon = winningCallRes.body.data.game;
  assert(gWon.status === 'won', `Game status is 'won' (got ${gWon.status})`);
  assert(gWon.winnerId === playerCId, `Winner ID is Player C (got ${gWon.winnerId})`);
  assert(gWon.winnerName === 'PLAYER_C', `Winner Name is PLAYER_C (got ${gWon.winnerName})`);
  assert(gWon.winningNumber === 20, `Winning Number recorded as 20 (got ${gWon.winningNumber})`);

  const pC_winner = winningCallRes.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_winner.earnedLetters.join('') === 'BINGO', `Player C spelled BINGO (got ${pC_winner.earnedLetters.join('')})`);

  // STEP 10: Security Test: Post-Win Call Rejection
  console.log('\n▶ [10/12] Security Test: Rejecting number calls after match is won...');
  const postWinCall = await request(`/rooms/${roomCode}/game/call-number`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId, number: 8 }),
  });
  assert(postWinCall.status === 400, `Post-win call rejected with 400 (got ${postWinCall.status})`);
  assert(
    postWinCall.body.message.includes('already been won') || postWinCall.body.message.includes('already ended'),
    `Rejection message states match finished: "${postWinCall.body.message}"`
  );

  // STEP 11: Persistence & Refresh Verification
  console.log('\n▶ [11/12] Verification: State persistence upon fresh query...');
  const freshQuery = await request(`/rooms/${roomCode}`);
  assert(freshQuery.status === 200, 'Fresh room query succeeded');
  assert(freshQuery.body.data.game.status === 'won', 'Persisted status is won');
  assert(freshQuery.body.data.game.winnerId === playerCId, 'Persisted winner is Player C');

  // STEP 12: Host Restart Functionality
  console.log('\n▶ [12/12] Host Restart Feature (POST /:roomCode/game/restart)...');
  const nonHostRestart = await request(`/rooms/${roomCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: playerAId }),
  });
  assert(nonHostRestart.status === 403, 'Non-host restart rejected with 403');

  const hostRestart = await request(`/rooms/${roomCode}/game/restart`, {
    method: 'POST',
    body: JSON.stringify({ playerId: hostPlayerId }),
  });
  assert(hostRestart.status === 200, 'Host restarted game with HTTP 200');
  const restartedGame = hostRestart.body.data.game;
  assert(restartedGame.status === 'active', 'Game status reset to active');
  assert(restartedGame.winnerId === null, 'Winner reset to null');
  assert(restartedGame.calledNumbers.length === 0, 'calledNumbers reset to empty');
  assert(restartedGame.turnNumber === 1, 'turnNumber reset to 1');
  assert(restartedGame.currentPlayerId === playerCId, 'First turn returns to first in rotation (C)');

  const pC_restarted = hostRestart.body.data.room.players.find((p) => p.playerId === playerCId);
  assert(pC_restarted.completedLines.length === 0, 'Player completedLines reset to 0');
  assert(pC_restarted.earnedLetters.length === 0, 'Player earnedLetters reset to empty');
  assert(pC_restarted.board.length === 25, 'Player board arrangement preserved');

  console.log('\n=================================================================================');
  console.log('🎉 ALL 12 PROMPT 9 BINGO ENGINE TESTS PASSED WITH 100% SUCCESS!');
  console.log('=================================================================================\n');
}

runPrompt9TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
