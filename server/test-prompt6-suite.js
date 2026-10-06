// Comprehensive Automated Test Suite for Prompt 6: Player Board Creation System
const http = require('http');

const API_BASE = process.env.API_URL || 'http://localhost:5001/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Fisher-Yates shuffle to generate randomized boards
function generateShuffledBoard(size) {
  const total = size * size;
  const arr = Array.from({ length: total }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function runPrompt6Tests() {
  console.log('====================================================');
  console.log('   BINGO ARENA - PROMPT 6 AUTOMATED VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.database === 'connected', 'Server & MongoDB connected');

    // 2. Create a 5x5 room
    const createRes = await request('POST', '/rooms', {
      hostName: 'TestHostYakshit',
      gridSize: 5,
      playerLimit: 10,
      winningWord: 'BINGO',
      callingMode: 'turn-based',
      hostParticipates: true,
    });
    assert(createRes.status === 201, '5x5 Room created successfully');
    const roomCode = createRes.body.data.roomCode;
    const hostPlayerId = createRes.body.data.playerId;

    // 3. Reject incomplete board (24 numbers for 5x5)
    const incompleteBoard = Array.from({ length: 24 }, (_, i) => i + 1);
    const incompleteRes = await request('POST', `/rooms/${roomCode}/players/${hostPlayerId}/board`, {
      cells: incompleteBoard,
    });
    assert(incompleteRes.status === 400, 'Rejects incomplete board (24 cells instead of 25)');

    // 4. Reject board with duplicate numbers
    const duplicateBoard = Array.from({ length: 25 }, (_, i) => (i === 24 ? 1 : i + 1));
    const duplicateRes = await request('POST', `/rooms/${roomCode}/players/${hostPlayerId}/board`, {
      cells: duplicateBoard,
    });
    assert(duplicateRes.status === 400, 'Rejects duplicate number placement');

    // 5. Reject board with numbers outside range (e.g. 0 or 26)
    const outOfRangeBoard = Array.from({ length: 25 }, (_, i) => (i === 24 ? 26 : i + 1));
    const outOfRangeRes = await request('POST', `/rooms/${roomCode}/players/${hostPlayerId}/board`, {
      cells: outOfRangeBoard,
    });
    assert(outOfRangeRes.status === 400, 'Rejects number outside 1..N^2 range');

    // 6. Submit valid 5x5 board (1..25 shuffled)
    const valid5x5 = generateShuffledBoard(5);
    const validSubmitRes = await request('POST', `/rooms/${roomCode}/players/${hostPlayerId}/board`, {
      cells: valid5x5,
    });
    assert(validSubmitRes.status === 200, 'Submits valid 5x5 board (1..25)');
    assert(validSubmitRes.body.data.board.length === 25, 'Saved board length is exactly 25');
    const submittedPlayer = validSubmitRes.body.data.room.players.find((p) => p.playerId === hostPlayerId);
    assert(submittedPlayer && submittedPlayer.hasSubmitted === true, 'Player hasSubmitted flag is true');
    assert(validSubmitRes.body.data.room.allSubmitted === true, 'Single player room is marked allSubmitted=true');

    // 7. Reject double submission / modify after locked
    const doubleSubmitRes = await request('POST', `/rooms/${roomCode}/players/${hostPlayerId}/board`, {
      cells: valid5x5,
    });
    assert(doubleSubmitRes.status === 409, 'Anti-Cheating: Rejects re-submission of locked board (409 Conflict)');

    // 8. Retrieve player board via API
    const getBoardRes = await request('GET', `/rooms/${roomCode}/players/${hostPlayerId}/board`);
    assert(getBoardRes.status === 200, 'Retrieves saved board via GET endpoint');
    assert(
      JSON.stringify(getBoardRes.body.data.board) === JSON.stringify(valid5x5),
      'Retrieved board matches exact submitted arrangement'
    );

    // 9. Multi-player submission test with 6x6 room
    console.log('\n  --- Multi-Player 6x6 Matrix Test ---');
    const create6x6 = await request('POST', '/rooms', {
      hostName: 'Host6x6',
      gridSize: 6,
      playerLimit: 10,
      winningWord: 'YAKSHI',
      callingMode: 'turn-based',
      hostParticipates: true,
    });
    const room6Code = create6x6.body.data.roomCode;
    const player1Id = create6x6.body.data.playerId;

    // Join Player 2
    const joinRes = await request('POST', '/rooms/join', {
      roomCode: room6Code,
      playerName: 'Prashant',
    });
    assert(joinRes.status === 200, 'Player 2 joins 6x6 room');
    const player2Id = joinRes.body.data.playerId;

    // Initially neither has submitted, allSubmitted should be false
    const initial6Room = await request('GET', `/rooms/${room6Code}`);
    assert(initial6Room.body.data.allSubmitted === false, 'Initially allSubmitted is false');

    // Player 1 submits valid 6x6 board (36 numbers)
    const valid6x6P1 = generateShuffledBoard(6);
    const p1Submit = await request('POST', `/rooms/${room6Code}/players/${player1Id}/board`, {
      cells: valid6x6P1,
    });
    assert(p1Submit.status === 200, 'Player 1 submits valid 6x6 board');
    assert(p1Submit.body.data.room.allSubmitted === false, 'After 1/2 players submit, allSubmitted is false');

    // Player 2 submits valid 6x6 board (36 numbers)
    const valid6x6P2 = generateShuffledBoard(6);
    const p2Submit = await request('POST', `/rooms/${room6Code}/players/${player2Id}/board`, {
      cells: valid6x6P2,
    });
    assert(p2Submit.status === 200, 'Player 2 submits valid 6x6 board');
    assert(p2Submit.body.data.room.allSubmitted === true, 'After 2/2 players submit, allSubmitted is true!');

    // 10. Large Grid Dynamic Validation Tests (7x7, 10x10, 20x20)
    console.log('\n  --- Dynamic Grid Size Testing (7x7, 10x10, 20x20) ---');

    // 7x7 Test (49 cells)
    const create7x7 = await request('POST', '/rooms', {
      hostName: 'Host7x7',
      gridSize: 7,
      playerLimit: 10,
      winningWord: 'SEVENER',
      callingMode: 'turn-based',
      hostParticipates: true,
    });
    const room7Code = create7x7.body.data.roomCode;
    const player7Id = create7x7.body.data.playerId;
    const valid7x7 = generateShuffledBoard(7);
    assert(valid7x7.length === 49, 'Generated 7x7 board with 49 sequential cells');
    const p7Submit = await request('POST', `/rooms/${room7Code}/players/${player7Id}/board`, {
      cells: valid7x7,
    });
    assert(p7Submit.status === 200, '7x7 board (49 cells) validated and submitted successfully');

    // 10x10 Test (100 cells)
    const create10x10 = await request('POST', '/rooms', {
      hostName: 'GridMaster',
      gridSize: 10,
      playerLimit: 10,
      winningWord: 'BINGOARENA',
      callingMode: 'turn-based',
      hostParticipates: true,
    });
    const room10Code = create10x10.body.data.roomCode;
    const player10Id = create10x10.body.data.playerId;
    const valid10x10 = generateShuffledBoard(10);
    assert(valid10x10.length === 100, 'Generated 10x10 board with 100 sequential cells');
    const p10Submit = await request('POST', `/rooms/${room10Code}/players/${player10Id}/board`, {
      cells: valid10x10,
    });
    assert(p10Submit.status === 200, '10x10 board (100 cells) validated and submitted successfully');

    // 20x20 Test (400 cells)
    const create20x20 = await request('POST', '/rooms', {
      hostName: 'TitanHost',
      gridSize: 20,
      playerLimit: 10,
      winningWord: 'ABCDEFGHIJKLMNOPQRST',
      callingMode: 'turn-based',
      hostParticipates: true,
    });
    const room20Code = create20x20.body.data.roomCode;
    const player20Id = create20x20.body.data.playerId;
    const valid20x20 = generateShuffledBoard(20);
    assert(valid20x20.length === 400, 'Generated 20x20 board with 400 sequential cells');
    const p20Submit = await request('POST', `/rooms/${room20Code}/players/${player20Id}/board`, {
      cells: valid20x20,
    });
    assert(p20Submit.status === 200, '20x20 board (400 cells) validated and submitted successfully');

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPrompt6Tests();
