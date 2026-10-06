import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
  Home,
  AlertCircle,
  X,
  CheckCircle2,
  DoorClosed,
} from 'lucide-react';
import { Room, Player, GameState } from '../../types';
import { BingoBoard } from '../board/BingoBoard';
import { soundManager } from '../../lib/sound';
import { NumberCallerGrid } from './NumberCallerGrid';
import { CurrentNumberBall } from './CurrentNumberBall';
import { RecentCallsList } from './RecentCallsList';
import { WinnerModal } from './WinnerModal';
import {
  getSocket,
  onSocketStatusChange,
  SocketConnectionStatus,
  callNumberSocket,
  requestGameStateSocket,
  joinRoomSocket,
  restartGameSocket,
  continueGameSocket,
  endGameSocket,
  closeRoomSocket,
} from '../../lib/socket';
import { roomService, mapBackendRoomToClient, BackendPublicRoom } from '../../lib/roomService';
import { clearPlayerSession } from '../../lib/session';

interface ActiveGameViewProps {
  room: Room;
  currentPlayer: Player;
  onExit?: () => void;
}

export function ActiveGameView({ room: initialRoom, currentPlayer, onExit }: ActiveGameViewProps) {
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isSoundOn, setIsSoundOn] = useState(() => soundManager.isSoundEnabled());
  const [isCallingNumber, setIsCallingNumber] = useState(false);
  const [callingNumberVal, setCallingNumberVal] = useState<number | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isRestartingMatch, setIsRestartingMatch] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketConnectionStatus>('CONNECTED');

  // Real-time letter achievement popup for all players
  interface LetterAchievement {
    id: string;
    playerName: string;
    isYou: boolean;
    letter: string;
    progress: number;
    total: number;
  }
  const [letterAchievement, setLetterAchievement] = useState<LetterAchievement | null>(null);
  const prevPlayersLettersRef = useRef<Record<string, number>>({});

  // Monitor real-time socket connection health
  useEffect(() => {
    return onSocketStatusChange((status) => {
      setSocketStatus(status);
    });
  }, []);

  // Sync prop changes
  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  const game: GameState | undefined = room.game;
  const gridSize = room.config.gridSize;

  // Lookup authoritative local player state from room.players
  const myPlayer = room.players.find((p) => p.id === currentPlayer.id) || currentPlayer;
  const playerBoard = myPlayer.board || currentPlayer.board || [];
  const myEarnedLetters = myPlayer.earnedLetters || [];
  const myCompletedLines = myPlayer.completedLines || [];

  // Determine current player
  const currentTurnPlayerId = game?.currentPlayerId;
  const currentTurnPlayer = room.players.find((p) => p.id === currentTurnPlayerId);
  const isMyTurn = currentTurnPlayerId === currentPlayer.id;

  const isWon = game?.status === 'won';
  const isNoWinner = game?.status === 'no_winner';
  const isGameOver = isWon || isNoWinner || game?.status === 'ended';
  const isCurrentPlayerWinner = Boolean(game?.winnerId && game.winnerId === currentPlayer.id);
  const isRoomClosed = room.status === 'closed';

  // Track previous turn to trigger audio chimes on turn transition
  const prevIsMyTurnRef = useRef<boolean>(isMyTurn);
  const prevGameStatusRef = useRef<string>(game?.status || 'active');

  // Determine next player in rotation
  const playerOrder =
    game?.playerOrder && game.playerOrder.length > 0
      ? game.playerOrder
      : room.players.map((p) => p.id);

  const currentIndex = game?.currentTurnIndex ?? 0;
  const nextIndex = playerOrder.length > 0 ? (currentIndex + 1) % playerOrder.length : 0;
  const nextPlayerId = playerOrder[nextIndex];
  const nextPlayer = room.players.find((p) => p.id === nextPlayerId);

  // Play turn chime when your turn activates
  useEffect(() => {
    if (!isGameOver && isMyTurn && !prevIsMyTurnRef.current) {
      soundManager.playTurnStart();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, isGameOver]);

  // Monitor letter completions across ALL room players in real-time
  useEffect(() => {
    const word = room.config.winningWord || 'BINGO';

    // Baseline map initialization on mount / first load
    if (Object.keys(prevPlayersLettersRef.current).length === 0 && room.players.length > 0) {
      const initialMap: Record<string, number> = {};
      room.players.forEach((p) => {
        initialMap[p.id] = p.earnedLetters?.length || p.completedLineCount || 0;
      });
      prevPlayersLettersRef.current = initialMap;
      return;
    }

    // Check each player's updated letter progress
    for (const p of room.players) {
      const currentCount = p.earnedLetters?.length || p.completedLineCount || 0;
      const prevCount = prevPlayersLettersRef.current[p.id] ?? currentCount;

      if (currentCount > prevCount) {
        const newlyEarnedLetter =
          p.earnedLetters?.[currentCount - 1] || word[currentCount - 1] || '';
        const isYou = p.id === currentPlayer.id;

        soundManager.playLineCompleted();

        setLetterAchievement({
          id: `${p.id}-${currentCount}-${Date.now()}`,
          playerName: p.name,
          isYou,
          letter: newlyEarnedLetter,
          progress: currentCount,
          total: word.length,
        });

        const timer = setTimeout(() => {
          setLetterAchievement(null);
        }, 5000);

        prevPlayersLettersRef.current[p.id] = currentCount;
        return () => clearTimeout(timer);
      } else {
        prevPlayersLettersRef.current[p.id] = currentCount;
      }
    }
  }, [room.players, room.config.winningWord, currentPlayer.id]);

  // Play winner fanfare when match ends in a win
  useEffect(() => {
    if (game?.status === 'won' && prevGameStatusRef.current !== 'won') {
      soundManager.playWinner();
    }
    prevGameStatusRef.current = game?.status || 'active';
  }, [game?.status]);

  // Real-time Socket.IO subscriptions for authoritative game engine events
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    const handleGameState = (rawRoom: BackendPublicRoom) => {
      if (rawRoom && rawRoom.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(rawRoom));
      }
    };

    const handleNumberCalled = (data: { room?: BackendPublicRoom; number?: number }) => {
      soundManager.playNumberCall();
      if (data?.room && data.room.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(data.room));
      }
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    };

    const handleGameWon = (winnerData: unknown) => {
      soundManager.playWinner();
      console.log('[Socket.IO] Game won by contender:', winnerData);
    };

    const handleGameNoWinner = () => {
      soundManager.playNoWinner();
    };

    const handleGameStarted = (data: { room?: BackendPublicRoom }) => {
      soundManager.playGameStart();
      if (data?.room && data.room.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(data.room));
      }
    };

    const handleGameContinued = (data: { room?: BackendPublicRoom }) => {
      soundManager.playNewRound();
      if (data?.room && data.room.roomCode === room.roomCode) {
        setRoom(mapBackendRoomToClient(data.room));
      }
    };

    const handleGameEnded = () => {
      navigate(`/results/${room.roomCode}`);
    };

    const handleRoomClosed = () => {
      soundManager.playRoomClosed();
      setRoom((prev) => ({ ...prev, status: 'closed' }));
    };

    const handleGameError = (data: { message?: string }) => {
      if (data?.message) {
        setCallError(data.message);
      }
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    };

    const unsubStatus = onSocketStatusChange((status) => {
      if (status === 'CONNECTED') {
        // Re-sync authoritative room and game state on reconnect
        joinRoomSocket(room.roomCode, currentPlayer.id).then((res) => {
          if (res.success && res.room) {
            setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
          }
        });
        requestGameStateSocket(room.roomCode).then((res) => {
          if (res.success && res.room) {
            setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
          }
        });
      }
    });

    socket.on('room:state', handleRoomState);
    socket.on('game:state', handleGameState);
    socket.on('game:number:called', handleNumberCalled);
    socket.on('game:won', handleGameWon);
    socket.on('game:no_winner', handleGameNoWinner);
    socket.on('game:started', handleGameStarted);
    socket.on('game:continued', handleGameContinued);
    socket.on('game:ended', handleGameEnded);
    socket.on('room:closed', handleRoomClosed);
    socket.on('game:error', handleGameError);

    return () => {
      unsubStatus();
      socket.off('room:state', handleRoomState);
      socket.off('game:state', handleGameState);
      socket.off('game:number:called', handleNumberCalled);
      socket.off('game:won', handleGameWon);
      socket.off('game:no_winner', handleGameNoWinner);
      socket.off('game:started', handleGameStarted);
      socket.off('game:continued', handleGameContinued);
      socket.off('game:ended', handleGameEnded);
      socket.off('room:closed', handleRoomClosed);
      socket.off('game:error', handleGameError);
    };
  }, [room.roomCode, currentPlayer.id]);

  // Guaranteed polling heartbeat: keeps game state synchronized even if socket drops
  useEffect(() => {
    const interval = setInterval(() => {
      roomService.getRoom(room.roomCode).then((res) => {
        if (res.success && res.data) {
          setRoom(res.data);
        }
      }).catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [room.roomCode]);

  // Handler for caller selecting a number from the grid
  const handleCallNumber = async (num: number) => {
    if (isGameOver || !isMyTurn || isCallingNumber) return;

    setIsCallingNumber(true);
    setCallingNumberVal(num);
    setCallError(null);

    try {
      // 1. Attempt via Socket.IO
      let res = await callNumberSocket(room.roomCode, currentPlayer.id, num);

      // 2. If Socket timed out or failed, fallback to REST API
      if (!res.success) {
        console.warn('[ActiveGameView] Socket callNumber failed or timed out, trying REST fallback:', res.message);
        const restRes = await roomService.callNumber(room.roomCode, currentPlayer.id, num);
        if (restRes.success && restRes.data) {
          res = {
            success: true,
            room: restRes.data.room,
            game: restRes.data.game,
          };
        } else {
          setCallError(restRes.message || res.message || 'Failed to call number.');
          return;
        }
      }

      soundManager.playNumberCall();
      if (res.room) {
        setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error calling number';
      setCallError(msg);
    } finally {
      setIsCallingNumber(false);
      setCallingNumberVal(null);
    }
  };

  // Host restarts match
  const handleRestartMatch = async () => {
    if (!currentPlayer.isHost || isRestartingMatch) return;
    setIsRestartingMatch(true);
    setCallError(null);

    try {
      let res = await restartGameSocket(room.roomCode, currentPlayer.id);
      if (!res.success) {
        const restRes = await roomService.restartGame(room.roomCode, currentPlayer.id);
        if (restRes.success && restRes.data) {
          res = { success: true, room: restRes.data.room };
        } else {
          setCallError(restRes.message || res.message || 'Failed to restart match.');
          return;
        }
      }

      if (res.room) {
        soundManager.playNewRound();
        setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error restarting match.';
      setCallError(msg);
    } finally {
      setIsRestartingMatch(false);
    }
  };

  // Host continues to next round
  const handleContinueMatch = async () => {
    if (!currentPlayer.isHost || isRestartingMatch) return;
    setIsRestartingMatch(true);
    setCallError(null);

    try {
      let res = await continueGameSocket(room.roomCode, currentPlayer.id);
      if (!res.success) {
        const restRes = await roomService.continueGame(room.roomCode, currentPlayer.id);
        if (restRes.success && restRes.data) {
          res = { success: true, room: restRes.data.room };
        } else {
          setCallError(restRes.message || res.message || 'Failed to start next round.');
          return;
        }
      }

      if (res.room) {
        soundManager.playNewRound();
        setRoom(mapBackendRoomToClient(res.room as BackendPublicRoom));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting round.';
      setCallError(msg);
    } finally {
      setIsRestartingMatch(false);
    }
  };

  // Host ends match -> transitions to Results
  const handleEndGame = async () => {
    if (!currentPlayer.isHost || isRestartingMatch) return;
    setIsRestartingMatch(true);
    setCallError(null);

    try {
      let res = await endGameSocket(room.roomCode, currentPlayer.id);
      if (!res.success) {
        const restRes = await roomService.endGame(room.roomCode, currentPlayer.id);
        if (restRes.success) {
          res = { success: true };
        } else {
          setCallError(restRes.message || res.message || 'Failed to end match.');
          return;
        }
      }
      navigate(`/results/${room.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ending match.';
      setCallError(msg);
    } finally {
      setIsRestartingMatch(false);
    }
  };

  // Host closes the room session
  const handleCloseRoom = async () => {
    if (!currentPlayer.isHost || isRestartingMatch) return;
    setIsRestartingMatch(true);
    setCallError(null);

    try {
      let res = await closeRoomSocket(room.roomCode, currentPlayer.id);
      if (!res.success) {
        const restRes = await roomService.closeRoom(room.roomCode, currentPlayer.id);
        if (restRes.success) {
          res = { success: true };
        } else {
          setCallError(restRes.message || res.message || 'Failed to close room.');
          return;
        }
      }
      soundManager.playRoomClosed();
      setRoom((prev) => ({ ...prev, status: 'closed' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error closing room.';
      setCallError(msg);
    } finally {
      setIsRestartingMatch(false);
    }
  };

  const toggleSound = () => {
    const next = soundManager.toggleSound();
    setIsSoundOn(next);
  };

  const winningWord = room.config.winningWord;
  const completedLetters = myEarnedLetters.length;
  const calledNumbers = game?.calledNumbers || [];
  const currentNumber =
    game?.currentNumber ?? (calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null);
  const currentCallerName =
    game?.currentCallerName ||
    (game?.lastCalledNumbers && game.lastCalledNumbers.length > 0
      ? game.lastCalledNumbers[0].playerName
      : null);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 select-none relative">
      {/* RECONNECTING ALERT BANNER */}
      {socketStatus !== 'CONNECTED' && (
        <div className="w-full px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>RECONNECTING... Restoring real-time multiplayer connection</span>
        </div>
      )}

      {/* ROOM CLOSED OVERLAY */}
      {isRoomClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-red-800/80 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-500/20 text-red-400 border border-red-500/40">
              <DoorClosed className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider">ROOM CLOSED</h3>
            <p className="text-xs text-slate-300">The host has closed this room.</p>
            <button
              onClick={() => {
                clearPlayerSession();
                navigate('/');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}

      {/* WINNER / NO-WINNER CELEBRATION MODAL OVERLAY */}
      {(isWon || isNoWinner) && (
        <WinnerModal
          status={isWon ? 'won' : 'no_winner'}
          winner={
            isWon && game?.winnerId
              ? {
                  playerId: game.winnerId,
                  playerName: game.winnerName || 'Champion Contender',
                  winningWord: game.winningWord || winningWord,
                  winningNumber: game.winningNumber || undefined,
                  wonAt: game.wonAt || undefined,
                  completedLines: isCurrentPlayerWinner ? myCompletedLines : game.winningLines,
                  earnedLetters: isCurrentPlayerWinner ? myEarnedLetters : undefined,
                }
              : null
          }
          winningWord={winningWord}
          gridSize={gridSize}
          totalCalls={calledNumbers.length}
          roundNumber={game?.roundNumber || 1}
          players={room.players}
          isCurrentPlayerWinner={isCurrentPlayerWinner}
          isHost={currentPlayer.isHost}
          onContinue={currentPlayer.isHost ? handleContinueMatch : undefined}
          onRestart={currentPlayer.isHost ? handleRestartMatch : undefined}
          onEndGame={currentPlayer.isHost ? handleEndGame : undefined}
          onCloseRoom={currentPlayer.isHost ? handleCloseRoom : undefined}
          onExit={onExit}
          isProcessingAction={isRestartingMatch}
        />
      )}

      {/* TOP ARENA BAR */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-arcade-border/80">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs text-arcade-muted hover:text-white transition px-2.5 py-1.5 rounded-lg border border-arcade-border/50 hover:bg-arcade-surface"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Exit Match</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-arcade-muted">ARENA:</span>
            <span className="font-mono text-base font-black text-white tracking-widest px-2.5 py-0.5 rounded-lg bg-arcade-bg border border-arcade-purple/50">
              {room.roomCode}
            </span>
            <span className="font-mono text-xs font-black text-arcade-gold px-2.5 py-1 rounded-lg bg-arcade-surface border border-arcade-border shadow-sm">
              ROUND {game?.roundNumber || 1}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active / Match Status Badge */}
          {isWon ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-xs font-black text-amber-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>MATCH WON: {game.winnerName}</span>
            </span>
          ) : isNoWinner ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-600 text-xs font-black text-slate-300">
              <span>NO WINNER (ROUND {game?.roundNumber || 1})</span>
            </span>
          ) : isGameOver ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/15 border border-slate-500/40 text-xs font-black text-slate-300">
              <span>MATCH CONCLUDED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-black text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>MATCH ACTIVE</span>
            </span>
          )}

          {/* Players in Match */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-bold text-arcade-gold">
            <Users className="w-3.5 h-3.5" />
            <span>{room.players.length} Players</span>
          </span>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isSoundOn ? 'Mute Sound' : 'Enable Sound'}
            className="p-1.5 rounded-lg bg-arcade-surface hover:bg-arcade-card border border-arcade-border text-slate-300 hover:text-white transition"
          >
            {isSoundOn ? (
              <Volume2 className="w-4 h-4 text-arcade-gold" />
            ) : (
              <VolumeX className="w-4 h-4 text-arcade-muted" />
            )}
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF NUMBER CALL FAILED */}
      <AnimatePresence>
        {callError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{callError}</span>
            </div>
            <button
              onClick={() => setCallError(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIVERSAL REAL-TIME LETTER UNLOCKED POP-UP (SHOWN TO ALL PLAYERS) */}
      <AnimatePresence>
        {letterAchievement && (
          <motion.div
            key={letterAchievement.id}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-auto"
          >
            <div className="relative rounded-2xl bg-gradient-to-r from-arcade-card via-slate-900 to-arcade-surface border-2 border-amber-400 p-4 shadow-[0_0_35px_rgba(251,191,36,0.65),0_10px_25px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3 min-w-0">
                {/* Glowing Unlocked Letter Tile */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 border-2 border-yellow-200 text-slate-950 font-mono font-black text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.85)] shrink-0 animate-bounce">
                  {letterAchievement.letter}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    <span>TARGET LETTER COMPLETED!</span>
                  </div>
                  <div className="text-sm font-extrabold text-white truncate mt-0.5">
                    {letterAchievement.isYou ? (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-arcade-magenta via-fuchsia-300 to-amber-300">
                        You completed a line and unlocked letter &ldquo;{letterAchievement.letter}&rdquo;!
                      </span>
                    ) : (
                      <span>
                        <strong className="text-arcade-gold">{letterAchievement.playerName}</strong> has unlocked letter &ldquo;{letterAchievement.letter}&rdquo;!
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                    Winning progress: <span className="text-arcade-gold font-bold">{letterAchievement.progress} / {letterAchievement.total}</span> letters
                  </div>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setLetterAchievement(null)}
                className="p-1.5 rounded-lg bg-arcade-bg/80 hover:bg-arcade-surface text-slate-400 hover:text-white transition shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. COMPACT COMMAND HUD (Turn Status, Compact Current Number Box, Winning Target) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* CURRENT TURN CARD (Compact) */}
        <motion.div
          layout
          className={`md:col-span-4 rounded-2xl p-3 sm:p-3.5 border transition-all flex items-center justify-between gap-3 overflow-hidden ${
            isGameOver
              ? 'bg-arcade-card/90 border-arcade-border'
              : isMyTurn
              ? 'bg-gradient-to-r from-arcade-magenta/20 via-arcade-card to-arcade-surface border-arcade-magenta shadow-[0_0_20px_rgba(217,70,239,0.3)]'
              : 'bg-arcade-card/80 border-arcade-purple/40 shadow-sm'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-arcade-gold">
              <Sparkles className="w-3 h-3" />
              <span>{isGameOver ? 'MATCH OVER' : `TURN #${game?.turnNumber ?? 1}`}</span>
            </div>
            <div className="text-sm sm:text-base font-black text-white tracking-wide truncate mt-0.5">
              {isWon ? (
                <span className="text-amber-300 truncate">{game.winnerName} WON!</span>
              ) : isGameOver ? (
                <span>GAME OVER</span>
              ) : isMyTurn ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-arcade-magenta via-fuchsia-300 to-amber-300 font-extrabold">
                  YOUR TURN
                </span>
              ) : (
                <span className="truncate">{currentTurnPlayer?.name || 'Contender'}&apos;s Turn</span>
              )}
            </div>
            <p className="text-[10px] text-arcade-muted truncate">
              {isGameOver
                ? 'Match completed'
                : isMyTurn
                ? 'Select a number on the right'
                : `Next: ${nextPlayer?.name || 'Next'}`}
            </p>
          </div>

          <div className="shrink-0">
            {isGameOver ? (
              <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 block">
                <Trophy className="w-4 h-4 text-amber-400" />
              </span>
            ) : isMyTurn ? (
              <span className="px-2.5 py-1 rounded-xl bg-arcade-magenta/30 border border-arcade-magenta text-fuchsia-200 text-[10px] font-black tracking-wider block animate-pulse">
                YOU CALL
              </span>
            ) : (
              <span className="p-2 rounded-xl bg-arcade-bg/80 border border-arcade-border text-arcade-muted block">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              </span>
            )}
          </div>
        </motion.div>

        {/* COMPACT CURRENT NUMBER BOX */}
        <div className="md:col-span-4">
          <CurrentNumberBall
            currentNumber={currentNumber}
            callerName={currentCallerName}
            turnNumber={game?.turnNumber ?? 1}
            compact={true}
            className="h-full"
          />
        </div>

        {/* WINNING PROGRESS TARGET (B I N G O) */}
        <div className="md:col-span-4 rounded-2xl bg-arcade-card/80 border border-arcade-border/80 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-arcade-gold">
              <Trophy className="w-3 h-3 text-arcade-gold shrink-0" />
              <span>TARGET ({winningWord})</span>
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-300 mt-0.5">
              <strong className="text-arcade-gold">{completedLetters}</strong> / {winningWord.length} Letters
            </div>
            <span className="text-[10px] text-arcade-muted block">
              {myCompletedLines.length} line(s) done
            </span>
          </div>

          {/* Letter Chips */}
          <div className="flex items-center gap-1 shrink-0">
            {winningWord.split('').map((letter, idx) => {
              const isUnlocked = idx < completedLetters;
              return (
                <motion.div
                  key={idx}
                  animate={isUnlocked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`w-7 h-8 sm:w-8 sm:h-9 rounded-lg border flex items-center justify-center font-mono font-black text-xs sm:text-sm select-none transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 border-yellow-200 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.8)] scale-105'
                      : 'bg-arcade-bg/90 border-arcade-border text-slate-500'
                  }`}
                >
                  {isUnlocked ? letter : '_'}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. COMPACT RECENT CALLS STRIP */}
      <RecentCallsList lastCalledNumbers={game?.lastCalledNumbers || []} compact={true} />

      {/* 3. MAIN ARENA: SIDE-BY-SIDE BOARD & NUMBER SELECTOR */}
      {/* Box beside Box layout requested: No scrolling required on laptops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* LEFT BOX: YOUR BOARD (N×N) */}
        <div className="rounded-3xl bg-arcade-card/90 border-2 border-arcade-border p-4 sm:p-5 shadow-arcade-card space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs pb-2.5 border-b border-arcade-border/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-white uppercase tracking-wider">
                YOUR BOARD ({gridSize}×{gridSize})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-arcade-magenta/20 border border-arcade-magenta/40 text-fuchsia-300 text-[10px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-amber-300" />
                <span>{myCompletedLines.length} Lines Done</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                AUTO-EVALUATED
              </span>
            </div>
          </div>

          {/* Render Bingo Board with Completed Line Visual Treatment */}
          <BingoBoard
            gridSize={gridSize}
            cells={playerBoard}
            onCellClick={() => {}}
            nextNumber={null}
            isLocked={true}
            calledNumbers={calledNumbers}
            completedLines={myCompletedLines}
          />

          <p className="text-[11px] text-center text-arcade-muted pt-1">
            Completed lines glow brightly with amber aura. Each finished line unlocks the next letter.
          </p>
        </div>

        {/* RIGHT BOX: NUMBER SELECTOR (N² NUMBERS) */}
        {/* Positioned right beside the board for instant selection without scrolling */}
        <div className="h-full">
          <NumberCallerGrid
            gridSize={gridSize}
            calledNumbers={calledNumbers}
            isMyTurn={isMyTurn}
            currentCallerName={currentTurnPlayer?.name || 'Active Player'}
            isProcessing={isCallingNumber}
            processingNumber={callingNumberVal}
            onCallNumber={handleCallNumber}
            isGameOver={isGameOver}
            gameOverMessage={
              isWon
                ? `🏆 Match concluded! Winner: ${game.winnerName}`
                : 'Match finished. All numbers called.'
            }
          />
        </div>
      </div>
    </div>
  );
}
