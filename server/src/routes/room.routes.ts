import { Router } from 'express';
import {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  leaveRoomHandler,
  kickPlayerHandler,
  updateMarkingModeHandler,
  submitBoardHandler,
  getBoardHandler,
  updateTurnOrderHandler,
  startGameHandler,
  advanceTurnHandler,
  callNumberHandler,
  callRandomNumberHandler,
  restartGameHandler,
  continueGameHandler,
  endGameHandler,
  closeRoomHandler,
} from '../controllers/room.controller';

const router = Router();

// POST /api/rooms - Create a room
router.post('/', createRoomHandler);

// POST /api/rooms/join - Join a room
router.post('/join', joinRoomHandler);

// GET /api/rooms/:roomCode - Get room details
router.get('/:roomCode', getRoomHandler);

// POST /api/rooms/:roomCode/leave - Leave room
router.post('/:roomCode/leave', leaveRoomHandler);

// POST /api/rooms/:roomCode/kick - Kick player (Host only)
router.post('/:roomCode/kick', kickPlayerHandler);

// PATCH /api/rooms/:roomCode/marking-mode - Update marking mode (Host only)
router.patch('/:roomCode/marking-mode', updateMarkingModeHandler);

// POST /api/rooms/:roomCode/players/:playerId/board - Submit and lock board
router.post('/:roomCode/players/:playerId/board', submitBoardHandler);

// GET /api/rooms/:roomCode/players/:playerId/board - Get player board
router.get('/:roomCode/players/:playerId/board', getBoardHandler);

// PUT /api/rooms/:roomCode/turn-order - Update player turn order (Host only)
router.put('/:roomCode/turn-order', updateTurnOrderHandler);

// POST /api/rooms/:roomCode/game/start - Start game authoritatively (Host only)
router.post('/:roomCode/game/start', startGameHandler);

// POST /api/rooms/:roomCode/game/call-number - Call a number (Current player only)
router.post('/:roomCode/game/call-number', callNumberHandler);

// POST /api/rooms/:roomCode/game/call-random - Call a random unused number (Random mode)
router.post('/:roomCode/game/call-random', callRandomNumberHandler);

// POST /api/rooms/:roomCode/game/restart - Host restarts match
router.post('/:roomCode/game/restart', restartGameHandler);

// POST /api/rooms/:roomCode/game/continue - Host continues to next round
router.post('/:roomCode/game/continue', continueGameHandler);

// POST /api/rooms/:roomCode/game/end - Host ends match
router.post('/:roomCode/game/end', endGameHandler);

// POST /api/rooms/:roomCode/close - Host closes room session
router.post('/:roomCode/close', closeRoomHandler);

// POST /api/rooms/:roomCode/game/advance-turn - Advance turn (Foundation helper)
router.post('/:roomCode/game/advance-turn', advanceTurnHandler);

export default router;
