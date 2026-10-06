import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Undo2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Trophy,
  AlertCircle,
  Clock,
  Play,
} from 'lucide-react';
import { Room, Player } from '../../types';
import { roomService, BackendPublicRoom, mapBackendRoomToClient } from '../../lib/roomService';
import { getSocket, joinRoomSocket } from '../../lib/socket';
import { Button } from '../ui/Button';
import { TiltCard } from '../ui/TiltCard';
import { BingoBoard } from './BingoBoard';

interface BoardSetupViewProps {
  room: Room;
  currentPlayer: Player;
  onBackToLobby?: () => void;
  onRoomUpdate?: (room: Room) => void;
}

export function BoardSetupView({
  room: initialRoom,
  currentPlayer,
  onBackToLobby,
  onRoomUpdate,
}: BoardSetupViewProps) {
  const [room, setRoom] = useState<Room>(initialRoom);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const gridSize = room.config.gridSize;
  const totalNumbers = gridSize * gridSize;

  // Initialize cells from existing player board if already submitted/saved
  const [cells, setCells] = useState<(number | null)[]>(() => {
    if (currentPlayer.board && currentPlayer.board.length === totalNumbers) {
      return currentPlayer.board;
    }
    return new Array(totalNumbers).fill(null);
  });

  // Track placement history for repeated undo operations
  const [placementHistory, setPlacementHistory] = useState<number[]>(() => {
    if (currentPlayer.board && currentPlayer.board.length === totalNumbers) {
      // If already filled, order of indices
      return [];
    }
    return [];
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(currentPlayer.hasSubmitted ?? false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const isHost = currentPlayer.isHost;

  // Derive counts
  const placedCount = useMemo(
    () => cells.filter((c) => c !== null).length,
    [cells]
  );
  const nextNumber = placedCount < totalNumbers ? placedCount + 1 : null;
  const progressPercent = Math.round((placedCount / totalNumbers) * 100);
  const isBoardFull = placedCount === totalNumbers;

  // Real-time synchronization for room status and other players' submission states
  useEffect(() => {
    const socket = getSocket();

    // Ensure socket is joined to room
    joinRoomSocket(room.roomCode, currentPlayer.id);

    const handleRoomState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        const mapped = mapBackendRoomToClient(rawRoom);
        setRoom(mapped);
        onRoomUpdate?.(mapped);

        // Update local submission state if server reports player has submitted
        const me = mapped.players.find((p) => p.id === currentPlayer.id);
        if (me?.hasSubmitted) {
          setIsSubmitted(true);
        }
      }
    };

    socket.on('room:state', handleRoomState);

    // Initial board fetch if already submitted
    if (currentPlayer.hasSubmitted) {
      roomService.getBoard(room.roomCode, currentPlayer.id).then((res) => {
        if (res.success && res.data?.board && res.data.board.length === totalNumbers) {
          setCells(res.data.board);
          setIsSubmitted(true);
        }
      });
    }

    return () => {
      socket.off('room:state', handleRoomState);
    };
  }, [room.roomCode, currentPlayer.id, currentPlayer.hasSubmitted, totalNumbers]);

  // Click empty cell to place next sequential number
  const handleCellClick = (index: number) => {
    if (isSubmitted || cells[index] !== null || nextNumber === null) {
      return;
    }

    const updatedCells = [...cells];
    updatedCells[index] = nextNumber;
    setCells(updatedCells);
    setPlacementHistory((prev) => [...prev, index]);
    setErrorMessage(null);
  };

  // Undo last placed number
  const handleUndo = () => {
    if (isSubmitted || placementHistory.length === 0) {
      return;
    }

    const lastPlacedIndex = placementHistory[placementHistory.length - 1];
    const updatedCells = [...cells];
    updatedCells[lastPlacedIndex] = null;
    setCells(updatedCells);
    setPlacementHistory((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  // Reset entire board (clears all numbers)
  const handleReset = () => {
    if (isSubmitted) return;
    setCells(new Array(totalNumbers).fill(null));
    setPlacementHistory([]);
    setShowResetConfirm(false);
    setErrorMessage(null);
  };

  // Final board submission
  const handleSubmit = async () => {
    if (isSubmitted || !isBoardFull || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await roomService.submitBoard(
        room.roomCode,
        currentPlayer.id,
        cells as number[]
      );

      if (response.success && response.data) {
        setIsSubmitted(true);
        setRoom(response.data.room);
        onRoomUpdate?.(response.data.room);
      } else {
        setErrorMessage(response.message || 'Failed to submit board.');
      }
    } catch {
      setErrorMessage('Network error while submitting board.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPlayersSubmitted = room.allSubmitted || (room.players.length > 0 && room.players.every((p) => p.hasSubmitted));

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-arcade-border/80">
        {onBackToLobby ? (
          <button
            onClick={onBackToLobby}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-arcade-muted hover:text-white transition group focus:outline-none focus:ring-2 focus:ring-arcade-purple/50 rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Lobby</span>
          </button>
        ) : (
          <div className="text-xs font-mono font-bold text-arcade-muted">
            ARENA ROOM: <span className="text-white">{room.roomCode}</span>
          </div>
        )}

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-xs font-black text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>BOARD LOCKED ✓</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-xs font-bold text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>PREPARING BOARD ({placedCount}/{totalNumbers})</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Board Canvas (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-5">
          {/* Header Title & Instruction */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
              PREPARE YOUR BOARD
            </h1>
            <p className="text-xs sm:text-sm text-arcade-muted">
              {isSubmitted
                ? 'Your board is locked and ready for the match!'
                : 'Click any empty cell to place the next sequential number.'}
            </p>
          </div>

          {/* Interactive Bingo Board */}
          <BingoBoard
            gridSize={gridSize}
            cells={cells}
            onCellClick={handleCellClick}
            nextNumber={nextNumber}
            isLocked={isSubmitted}
          />

          {/* Board Action Buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2 w-full max-w-md">
            {/* Undo Button */}
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmitted || placementHistory.length === 0}
              onClick={handleUndo}
              leftIcon={<Undo2 className="w-4 h-4 text-arcade-gold" />}
            >
              UNDO LAST
            </Button>

            {/* Reset Button */}
            <Button
              variant="secondary"
              size="sm"
              disabled={isSubmitted || placedCount === 0}
              onClick={() => setShowResetConfirm(true)}
              leftIcon={<RotateCcw className="w-4 h-4 text-rose-400" />}
            >
              RESET BOARD
            </Button>

            {/* Submit Button */}
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitted || !isBoardFull || isSubmitting}
              isLoading={isSubmitting}
              onClick={handleSubmit}
              leftIcon={<CheckCircle2 className="w-4 h-4 text-arcade-gold" />}
              className={`font-black ${
                isBoardFull && !isSubmitted ? 'shadow-neon-magenta animate-pulse' : ''
              }`}
            >
              {isSubmitted ? 'SUBMITTED ✓' : 'SUBMIT BOARD'}
            </Button>
          </div>

          {/* Incomplete Placement Guide */}
          {!isSubmitted && !isBoardFull && (
            <p className="text-[11px] text-center text-arcade-muted">
              Place all {totalNumbers} numbers before submitting ({totalNumbers - placedCount} remaining).
            </p>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full max-w-md p-3.5 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: Status Drawer, Next Indicator & Progress (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Next Number Indicator Card */}
          <TiltCard elevated glowColor="magenta" className="p-5 text-center space-y-3">
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
              {isSubmitted ? 'BOARD STATUS' : 'NEXT NUMBER TO PLACE'}
            </div>

            {isSubmitted ? (
              <div className="py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="font-mono text-xl font-black text-white">ALL {totalNumbers} PLACED</span>
              </div>
            ) : nextNumber !== null ? (
              <div className="py-2.5 px-6 rounded-2xl bg-arcade-bg/90 border border-arcade-purple/50 inline-block shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
                <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-wider selection:bg-arcade-magenta">
                  {nextNumber}
                </span>
              </div>
            ) : (
              <div className="py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm">
                Ready to submit!
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-arcade-muted">BOARD PROGRESS</span>
                <span className="text-arcade-gold">
                  {placedCount} / {totalNumbers} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-arcade-bg border border-arcade-border overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-gradient-to-r from-arcade-purple via-arcade-magenta to-amber-400"
                />
              </div>
            </div>
          </TiltCard>

          {/* Room Configuration Target Card */}
          <TiltCard className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-arcade-border/80">
              <span className="font-extrabold text-white uppercase flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-arcade-gold" />
                <span>Winning Word Target</span>
              </span>
              <span className="text-arcade-muted font-mono">{gridSize}×{gridSize}</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1 flex-wrap">
              {room.config.winningWord.split('').map((letter, idx) => (
                <div
                  key={idx}
                  className="w-8 h-9 rounded-lg bg-arcade-bg border border-arcade-border/80 flex items-center justify-center font-black text-sm text-arcade-gold shadow-sm font-mono"
                >
                  {letter}
                </div>
              ))}
            </div>

            <div className="text-[11px] text-arcade-muted text-center">
              Each completed row, column, or diagonal line will unlock one letter of your word.
            </div>
          </TiltCard>

          {/* Real-time Player Submission Roster */}
          <div className="rounded-2xl bg-arcade-card border border-arcade-border p-5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-arcade-border/80">
              <span className="font-extrabold text-white uppercase">
                Player Submissions
              </span>
              <span className="font-mono text-xs text-arcade-gold font-bold">
                {room.players.filter((p) => p.hasSubmitted).length} / {room.players.length} Ready
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {room.players.map((p) => {
                const isYou = p.id === currentPlayer.id;
                const submitted = isYou ? isSubmitted : p.hasSubmitted;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-arcade-surface/60 border border-arcade-border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-bold text-white truncate max-w-[120px]">
                        {p.name}
                      </span>
                      {isYou && (
                        <span className="px-1.5 py-0.2 rounded bg-arcade-purple/30 text-fuchsia-300 text-[10px] font-black">
                          YOU
                        </span>
                      )}
                      {p.isHost && (
                        <span className="text-[10px] font-black text-amber-300">
                          👑 HOST
                        </span>
                      )}
                    </div>

                    {submitted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-arcade-muted text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Preparing…</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* All Players Submitted Celebration / Host Start Foundation */}
            {allPlayersSubmitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/50 space-y-2 text-center"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-300">
                  <Sparkles className="w-4 h-4 text-arcade-gold" />
                  <span>ALL BOARDS READY!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Every player in the room has submitted their board.
                </p>

                {isHost ? (
                  <div className="pt-1 space-y-2">
                    {onBackToLobby && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={onBackToLobby}
                        className="w-full text-xs font-black shadow-neon-gold"
                        leftIcon={<Play className="w-4 h-4 text-arcade-gold" />}
                      >
                        RETURN TO LOBBY TO START GAME
                      </Button>
                    )}
                    <p className="text-[10px] text-arcade-muted">
                      Set turn order and launch the match in the lobby.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-arcade-muted">
                    Waiting for host ({room.hostName}) to begin the match...
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-arcade-card border border-arcade-border p-6 shadow-arcade-card space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Reset Board Arrangement?
                  </h3>
                  <p className="text-xs text-arcade-muted">
                    All placed numbers will be removed. You will start placing from 1 again.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Keep Board
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleReset}
                  className="bg-rose-600 hover:bg-rose-500 border-rose-500 text-white"
                >
                  Yes, Reset Board
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
