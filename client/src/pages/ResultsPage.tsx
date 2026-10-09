import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ArrowLeft,
  RotateCcw,
  Crown,
  History,
  Users,
  AlertTriangle,
  DoorClosed,
  Home,
  Hash,
} from 'lucide-react';
import { roomService } from '../lib/roomService';
import { getPlayerSession, clearPlayerSession } from '../lib/session';
import { Room, GameState, RoundRecord } from '../types';
import { PageTransition } from '../components/layout/PageTransition';
import { TiltCard } from '../components/ui/TiltCard';
import { Interactive3DStage } from '../components/ui/Interactive3DStage';
import { CelebrationFx } from '../components/game/CelebrationFx';
import { soundManager } from '../lib/sound';
import { continueGameSocket, restartGameSocket, closeRoomSocket, getSocket } from '../lib/socket';

export function ResultsPage() {
  const { roomCode: paramCode } = useParams<{ roomCode?: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [confirmCloseRoom, setConfirmCloseRoom] = useState(false);

  const session = getPlayerSession();
  const roomCode = paramCode || session?.roomCode || '';
  const myPlayerId = session?.playerId || '';

  // Load authoritative room and game state from server
  useEffect(() => {
    async function fetchResults() {
      if (!roomCode) {
        setError('No room code provided. Please return to the lobby.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await roomService.getRoom(roomCode);
        if (res.success && res.data) {
          setRoom(res.data);
          setError(null);
        } else {
          setError(res.message || 'Game results are not available yet.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to retrieve match results.');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [roomCode]);

  // Real-time socket listener for state updates or room closure
  useEffect(() => {
    const socket = getSocket();

    const handleRoomClosed = (data: { roomCode: string; message: string }) => {
      if (!roomCode || data.roomCode === roomCode.toUpperCase()) {
        soundManager.playRoomClosed();
        setRoom((prev) => (prev ? { ...prev, status: 'closed' } : null));
      }
    };

    const handleGameStarted = () => {
      // Host continued or restarted match -> navigate back to active game
      navigate(`/game/${roomCode}`);
    };

    socket.on('room:closed', handleRoomClosed);
    socket.on('game:started', handleGameStarted);
    socket.on('game:continued', handleGameStarted);

    return () => {
      socket.off('room:closed', handleRoomClosed);
      socket.off('game:started', handleGameStarted);
      socket.off('game:continued', handleGameStarted);
    };
  }, [roomCode, navigate]);

  // Compute game duration from server timestamps
  const formatDuration = (startedAt?: string | null, endedAt?: string | null) => {
    if (!startedAt) return '00:00';
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleContinueRound = async () => {
    if (!roomCode || !myPlayerId || isActionPending) return;
    setIsActionPending(true);
    try {
      const res = await continueGameSocket(roomCode, myPlayerId);
      if (res.success) {
        navigate(`/game/${roomCode}`);
      } else {
        // Fallback to REST API
        const apiRes = await roomService.continueGame(roomCode, myPlayerId);
        if (apiRes.success) {
          navigate(`/game/${roomCode}`);
        } else {
          setError(apiRes.message || 'Failed to start next round.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting round.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRestartRound = async () => {
    if (!roomCode || !myPlayerId || isActionPending) return;
    setIsActionPending(true);
    try {
      const res = await restartGameSocket(roomCode, myPlayerId);
      if (res.success) {
        navigate(`/game/${roomCode}`);
      } else {
        const apiRes = await roomService.restartGame(roomCode, myPlayerId);
        if (apiRes.success) {
          navigate(`/game/${roomCode}`);
        } else {
          setError(apiRes.message || 'Failed to restart round.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error restarting round.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!roomCode || !myPlayerId || isActionPending) return;
    setIsActionPending(true);
    try {
      const res = await closeRoomSocket(roomCode, myPlayerId);
      if (res.success) {
        setRoom((prev) => (prev ? { ...prev, status: 'closed' } : null));
      } else {
        const apiRes = await roomService.closeRoom(roomCode, myPlayerId);
        if (apiRes.success) {
          setRoom((prev) => (prev ? { ...prev, status: 'closed' } : null));
        } else {
          setError(apiRes.message || 'Failed to close room.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error closing room.');
    } finally {
      setIsActionPending(false);
      setConfirmCloseRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-arcade-purple border-t-arcade-gold rounded-full animate-spin" />
        <span className="text-xs font-mono text-arcade-muted">Loading authoritative match results...</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <PageTransition className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white uppercase">Results Unavailable</h2>
        <p className="text-xs text-arcade-muted leading-relaxed">{error || 'Unable to load room data.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-arcade-surface hover:bg-arcade-card border border-arcade-border text-xs font-bold text-white uppercase tracking-wider"
        >
          <Home className="w-4 h-4" />
          <span>Return to Lobby</span>
        </Link>
      </PageTransition>
    );
  }

  const isRoomClosed = room.status === 'closed';
  const isHost = room.hostId === myPlayerId;
  const game: GameState | undefined = room.game;
  const isWon = game?.status === 'won' || Boolean(game?.winnerId);
  const winningWord = game?.winningWord || room.config.winningWord || 'BINGO';
  const targetLetters = winningWord.split('');
  const gridSize = room.config.gridSize;
  const maxNumbers = gridSize * gridSize;
  const calledNumbers = game?.calledNumbers || [];
  const totalCalls = calledNumbers.length;
  const callHistory = game?.callHistory || [];
  const roundHistory: RoundRecord[] = game?.roundHistory || [];
  const durationStr = formatDuration(game?.startedAt, game?.endedAt || game?.wonAt);

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-6 sm:py-10 w-full space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-arcade-border/80">
        <Link
          to="/"
          onClick={() => clearPlayerSession()}
          className="inline-flex items-center gap-2 text-xs font-bold text-arcade-muted hover:text-white transition px-3 py-1.5 rounded-xl border border-arcade-border/50 hover:bg-arcade-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-arcade-muted font-bold">ARENA:</span>
          <span className="font-mono text-xs font-black text-white px-2.5 py-1 rounded-lg bg-arcade-bg border border-arcade-purple/50">
            {room.roomCode}
          </span>
          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-arcade-surface border border-arcade-border text-arcade-gold">
            ROUND {game?.roundNumber || 1}
          </span>
        </div>
      </div>

      {/* ROOM CLOSED ALERT BANNER */}
      {isRoomClosed && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-red-400 font-extrabold text-sm uppercase">
            <DoorClosed className="w-4 h-4" />
            <span>ROOM CLOSED</span>
          </div>
          <p className="text-xs text-red-300">The host has closed this multiplayer room session.</p>
        </div>
      )}

      {/* REAL-TIME CELEBRATION FX (Fireworks, Sparks, Crackers, Burning Flares & 3D Falling Flower Petals) */}
      <CelebrationFx active={isWon} />

      {/* HERO PODIUM / RESULT CARD WITH 3D INTERACTIVE TILT */}
      <Interactive3DStage maxTiltX={6} maxTiltY={8} depth={25}>
        <TiltCard elevated glowColor="gold" className="p-6 sm:p-8 text-center space-y-6">
          {isWon ? (
            <>
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-400/20 to-purple-600/30 border-2 border-arcade-gold p-1 shadow-[0_0_35px_rgba(251,191,36,0.5)] flex items-center justify-center">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-arcade-gold animate-bounce" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-arcade-magenta border border-fuchsia-300 shadow-neon-magenta text-[10px] font-black uppercase tracking-wider text-white">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>CHAMPION CONCLUDED</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-arcade-gold to-yellow-400 tracking-wide uppercase">
                  {game?.winnerName || 'Winner'}
                </h1>
                <p className="text-xs sm:text-sm text-arcade-muted">
                  Completed the target word target first!
                </p>
              </div>

              {/* Winning Word Letters */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap py-2">
                {targetLetters.map((l, idx) => (
                  <div
                    key={idx}
                    className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 border-2 border-yellow-200 text-slate-950 font-mono font-black text-xl sm:text-2xl shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center"
                  >
                    {l}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-200 tracking-wide uppercase">
                  NO WINNER
                </h1>
                <p className="text-xs sm:text-sm text-arcade-muted max-w-md mx-auto">
                  All {maxNumbers} numbers have been called. No player completed the winning word "{winningWord}".
                </p>
              </div>
            </>
          )}

          {/* Core Match Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Winning Word</span>
              <div className="text-sm font-mono font-black text-arcade-gold mt-1">{winningWord}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Winning Call</span>
              <div className="text-sm font-mono font-black text-white mt-1">
                {game?.winningNumber ? `#${game.winningNumber}` : '—'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Numbers Called</span>
              <div className="text-sm font-mono font-black text-white mt-1">
                {totalCalls} / {maxNumbers}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Game Duration</span>
              <div className="text-sm font-mono font-black text-emerald-400 mt-1">{durationStr}</div>
            </div>
          </div>
        </TiltCard>
      </Interactive3DStage>

      {/* PLAYER RESULTS (Section 27) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-300">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-arcade-gold" />
            <span>PLAYER RESULTS</span>
          </span>
          <span className="text-arcade-muted text-[11px]">{room.players.length} Contenders</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {room.players.map((p) => {
            const isWinner = isWon && p.id === game?.winnerId;
            const earned = p.earnedLetters || [];
            const lines = p.completedLineCount || (p.completedLines ? p.completedLines.length : 0);

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-gradient-to-b from-amber-500/15 via-slate-950 to-purple-950/30 border-arcade-gold shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-arcade-surface/70 border-arcade-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-white text-sm truncate flex items-center gap-1.5">
                    {p.name} {p.isHost ? '(Host)' : ''}
                  </span>
                  {isWinner ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Winner 🏆</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">{lines} {lines === 1 ? 'Line' : 'Lines'}</span>
                  )}
                </div>

                {/* Letters representation */}
                <div className="flex items-center gap-1.5 py-1">
                  {targetLetters.map((l, i) => {
                    const isLetterEarned = earned.includes(l) || isWinner;
                    return (
                      <span
                        key={i}
                        className={`w-7 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                          isLetterEarned
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/60'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                      >
                        {isLetterEarned ? l : '_'}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-2 text-[11px] text-slate-400 font-mono">
                  Completed Lines: {lines} / {winningWord.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FINAL CALLED-NUMBER HISTORY (Section 31 - Responsive & Scrollable) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-300">
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-arcade-magenta" />
            <span>FINAL CALL HISTORY</span>
          </span>
          <span className="text-arcade-muted font-mono">{callHistory.length} Total Calls</span>
        </div>

        {callHistory.length > 0 ? (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {callHistory.map((call, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 w-5">#{idx + 1}</span>
                    <span className="w-7 h-7 rounded-lg bg-arcade-magenta/20 border border-fuchsia-400/40 text-fuchsia-300 font-mono font-bold text-xs flex items-center justify-center">
                      {call.number}
                    </span>
                  </div>
                  <span className="text-slate-300 font-semibold truncate max-w-[100px] text-[11px]">
                    {call.playerName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-500">No call history recorded.</div>
        )}
      </div>

      {/* ROUND HISTORY ACCORDION / ARCHIVE (Section 12, 14) */}
      {roundHistory.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-arcade-purple" />
              <span>ROUND HISTORY ({roundHistory.length})</span>
            </span>
            <span className="text-arcade-muted text-[11px]">Historical Records</span>
          </div>

          <div className="space-y-2">
            {roundHistory.map((rnd) => (
              <div
                key={rnd.roundNumber}
                className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-arcade-purple/20 text-arcade-purple font-mono font-black text-xs border border-purple-500/30">
                    ROUND {rnd.roundNumber}
                  </span>
                  <span className="font-bold text-white">
                    {rnd.noWinner ? (
                      <span className="text-slate-400">No Winner</span>
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        {rnd.winnerName}
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                  {rnd.winningNumber && <span>Call: #{rnd.winningNumber}</span>}
                  <span>Calls: {rnd.totalCalls}</span>
                  <span>{formatDuration(rnd.startedAt, rnd.endedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOST DECISION CONTROLS OR NON-HOST STATUS */}
      {!isRoomClosed && (
        <div className="p-4 rounded-2xl bg-arcade-surface/80 border border-arcade-border space-y-3">
          {isHost ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {isWon ? (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleContinueRound}
                  className="flex-1 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-arcade-purple to-arcade-magenta hover:from-purple-500 hover:to-fuchsia-500 border border-fuchsia-300 text-white font-black text-xs uppercase tracking-wider shadow-neon-magenta flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isActionPending ? 'animate-spin' : ''}`} />
                  <span>CONTINUE GAME (ROUND {(game?.roundNumber || 1) + 1})</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={handleRestartRound}
                  className="flex-1 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-arcade-purple to-arcade-magenta hover:from-purple-500 hover:to-fuchsia-500 border border-fuchsia-300 text-white font-black text-xs uppercase tracking-wider shadow-neon-magenta flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isActionPending ? 'animate-spin' : ''}`} />
                  <span>RESTART GAME</span>
                </button>
              )}

              <button
                type="button"
                disabled={isActionPending}
                onClick={() => setConfirmCloseRoom(true)}
                className="py-3 px-5 w-full sm:w-auto rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                <DoorClosed className="w-4 h-4 text-red-400" />
                <span>END ROOM</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-arcade-muted flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-arcade-magenta animate-ping" />
              <span>Waiting for host to continue match or close room...</span>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR CLOSING ROOM */}
      <AnimatePresence>
        {confirmCloseRoom && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="results-confirm-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-red-500/20 text-red-400 border border-red-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 id="results-confirm-title" className="text-lg font-black text-white uppercase">
                Close this room?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will disconnect the current game session for all players.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmCloseRoom(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleCloseRoom}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase shadow-lg shadow-red-900/40"
                >
                  CLOSE ROOM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
