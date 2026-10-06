import { Router } from 'express';
import {
  createRoomHandler,
  joinRoomHandler,
  getRoomHandler,
  leaveRoomHandler,
  submitBoardHandler,
  getBoardHandler,
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

// POST /api/rooms/:roomCode/players/:playerId/board - Submit and lock board
router.post('/:roomCode/players/:playerId/board', submitBoardHandler);

// GET /api/rooms/:roomCode/players/:playerId/board - Get player board
router.get('/:roomCode/players/:playerId/board', getBoardHandler);

export default router;
