import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import {
  Trophy,
  Sparkles,
  RotateCcw,
  Home,
  Crown,
  Flame,
  CheckCircle2,
  AlertTriangle,
  DoorClosed,
  Clock,
  Users,
  Skull,
} from 'lucide-react';
import { WinnerInfo, Player, PlayerRanking } from '../../types';
import { BingoBall3D } from '../three/BingoBall3D';
import { CelebrationFx } from './CelebrationFx';
import { Interactive3DStage } from '../ui/Interactive3DStage';

interface WinnerModalProps {
  status: 'won' | 'no_winner';
  winner?: WinnerInfo | {
    playerId: string;
    playerName: string;
    winningWord: string;
    winningNumber?: number;
    wonAt?: string;
    completedLines?: string[];
    earnedLetters?: string[];
  } | null;
  loserId?: string | null;
  loserName?: string | null;
  rankings?: PlayerRanking[];
  winningWord: string;
  gridSize: number;
  totalCalls: number;
  roundNumber?: number;
  players?: Player[];
  isCurrentPlayerWinner: boolean;
  isHost: boolean;
  onContinue?: () => void;
  onRestart?: () => void;
  onEndGame?: () => void;
  onCloseRoom?: () => void;
  onExit?: () => void;
  isProcessingAction?: boolean;
}

export function WinnerModal({
  status,
  winner,
  loserId,
  loserName,
  rankings = [],
  winningWord = 'BINGO',
  gridSize,
  totalCalls,
  roundNumber = 1,
  players = [],
  isCurrentPlayerWinner,
  isHost,
  onContinue,
  onRestart,
  onEndGame,
  onCloseRoom,
  onExit,
  isProcessingAction = false,
}: WinnerModalProps) {
  const [confirmDialog, setConfirmDialog] = useState<'close_room' | 'new_round' | null>(null);

  const isWon = status === 'won' && Boolean(winner);
  const maxNumbers = gridSize * gridSize;
  const targetLetters = winningWord.split('');
  const winningNumber = winner?.winningNumber;

  // Escape key handler for confirmation dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmDialog) {
        setConfirmDialog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
    >
      {/* Outer ambient celebratory aura - Gold / Magenta / Purple */}
      <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-arcade-purple/30 via-arcade-magenta/30 to-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* High-Performance 60FPS Celebration FX (Fireworks, Sparks, Flares & Flower Petals) */}
      <CelebrationFx active={isWon} />

      {/* Floating Celebration Confetti Particles */}
      {isWon && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => {
            const colors = ['#F59E0B', '#D946EF', '#A855F7', '#EC4899', '#10B981', '#FBBF24'];
            const color = colors[i % colors.length];
            const left = `${(i * 3.6) % 100}%`;
            const delay = `${(i * 0.12) % 2.5}s`;
            const duration = `${2.5 + (i % 3)}s`;

            return (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-sm opacity-80 animate-bounce"
                style={{
                  backgroundColor: color,
                  left,
                  top: `${(i * 6.5) % 85}%`,
                  animationDelay: delay,
                  animationDuration: duration,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Modal Container with 3D Perspective */}
      <Interactive3DStage maxTiltX={4} maxTiltY={6} depth={15} className="max-w-lg my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-lg rounded-3xl bg-gradient-to-b from-arcade-card via-slate-950 to-arcade-bg border-2 border-arcade-gold/80 p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center space-y-5 overflow-hidden my-auto"
        >
        {/* Round Badge Indicator */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcade-surface/90 border border-arcade-border text-[11px] font-black uppercase tracking-wider text-arcade-gold">
            <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            <span>ROUND {roundNumber}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcade-surface/90 border border-arcade-border text-[11px] font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Calls: {totalCalls} / {maxNumbers}</span>
          </div>
        </div>

        {/* 3D Visual Centerpiece */}
        {isWon ? (
          <div className="relative mx-auto flex flex-col items-center justify-center">
            {/* 3D Bingo Ball Canvas & Trophy Container */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-purple-600/20 p-2 border border-arcade-gold/60 shadow-[0_0_35px_rgba(251,191,36,0.5)] flex items-center justify-center overflow-hidden">
              {winningNumber !== undefined && winningNumber !== null ? (
                <div className="w-full h-full">
                  <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
                    <ambientLight intensity={1.2} />
                    <directionalLight position={[3, 4, 2]} intensity={2.2} />
                    <BingoBall3D
                      number={winningNumber}
                      size={0.95}
                      color="#F59E0B"
                      accentColor="#D946EF"
                      rotationSpeed={1.2}
                      floatSpeed={1.5}
                    />
                  </Canvas>
                </div>
              ) : (
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                  <Trophy className="w-14 h-14 text-arcade-gold animate-bounce" />
                </div>
              )}
            </div>

            {/* Victory Badge */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-arcade-magenta border border-fuchsia-300 shadow-neon-magenta text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>{isCurrentPlayerWinner ? 'YOU ARE THE CHAMPION!' : 'CHAMPION'}</span>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto flex flex-col items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-arcade-surface/90 border border-slate-700 shadow-inner flex items-center justify-center text-slate-400">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
            </div>
            <div className="mt-2 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-[11px] font-black uppercase tracking-wider text-slate-300">
              ALL NUMBERS CALLED
            </div>
          </div>
        )}

        {/* Announcement Headline */}
        <div className="space-y-1">
          <h2 id="winner-modal-title" className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            {isWon ? (
              isCurrentPlayerWinner ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-arcade-gold to-yellow-400 drop-shadow-md">
                  VICTORY IS YOURS!
                </span>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-arcade-gold to-yellow-400">
                  {winner?.playerName} WINS!
                </span>
              )
            ) : (
              <span className="text-slate-200">NO WINNER</span>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-arcade-muted max-w-sm mx-auto">
            {isWon
              ? `${winner?.playerName} completed "${winningWord}" with all required lines!`
              : `All ${maxNumbers} numbers have been called. No contender completed "${winningWord}".`}
          </p>
        </div>

        {/* Word Progress / Completed Letters Ribbon */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-arcade-surface/80 border border-arcade-border space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-arcade-gold flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            <span>{isWon ? 'COMPLETED WORD TARGET' : 'TARGET WORD PROGRESS'}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap py-1">
            {targetLetters.map((letter, idx) => {
              const isEarned = isWon || (winner?.earnedLetters && winner.earnedLetters.includes(letter));
              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08, type: 'spring' }}
                  className={`w-10 h-11 sm:w-11 sm:h-12 rounded-xl border-2 font-mono font-black text-lg sm:text-xl flex items-center justify-center transition-all ${
                    isEarned
                      ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 border-yellow-200 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {isEarned ? letter : '_'}
                </motion.div>
              );
            })}
          </div>

          <div className="text-xs text-slate-300 font-mono flex items-center justify-center gap-4 pt-1 flex-wrap">
            {isWon && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {winner?.completedLines ? winner.completedLines.length : targetLetters.length} Lines Completed
                </span>
              </span>
            )}

            {winningNumber !== undefined && winningNumber !== null && (
              <span className="text-arcade-gold font-bold">
                Winning Number: #{winningNumber}
              </span>
            )}
          </div>
        </div>

        {/* DESIGNATED SINGLE LOSER HIGHLIGHT */}
        {loserName && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/60 border-2 border-rose-500/60 text-center space-y-1 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300">
              <Skull className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>THE ONLY LOSER OF THIS MATCH</span>
            </div>
            <div className="text-base font-black text-rose-200">
              {loserName}
            </div>
            <p className="text-[10px] text-slate-400">
              Last remaining contender who could not complete the letters before all other players!
            </p>
          </div>
        )}

        {/* Players Progress Summary (Rankings & Standings) */}
        {players.length > 0 && (
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 max-h-36 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-arcade-purple" />
                <span>Contenders Standings</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">1 Winner • 1 Loser</span>
            </div>
            <div className="space-y-1">
              {players.map((p) => {
                const earned = p.earnedLetters || [];
                const lines = p.completedLineCount || (p.completedLines ? p.completedLines.length : 0);
                const isThisWinner = isWon && p.id === winner?.playerId;
                const isThisLoser = loserId ? p.id === loserId : false;
                const rankObj = rankings.find((r) => r.playerId === p.id);

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                      isThisWinner
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                        : isThisLoser
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-[140px] flex items-center gap-1.5">
                      {isThisWinner && <Crown className="w-3 h-3 text-arcade-gold shrink-0" />}
                      {isThisLoser && <Skull className="w-3 h-3 text-rose-400 shrink-0" />}
                      {rankObj && !isThisWinner && !isThisLoser && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                          #{rankObj.rank}
                        </span>
                      )}
                      <span>{p.name} {p.isHost ? '(Host)' : ''}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {isThisLoser ? (
                        <span className="text-rose-400 font-black tracking-wider uppercase text-[10px]">LOSER</span>
                      ) : isThisWinner ? (
                        <span className="text-amber-300 font-black tracking-wider uppercase text-[10px]">WINNER</span>
                      ) : (
                        targetLetters.map((l) => (earned.includes(l) ? l : '_')).join(' ')
                      )}
                      <span className="ml-2 text-slate-500">({lines} {lines === 1 ? 'line' : 'lines'})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Host Controls vs Normal Player Waiting State */}
        <div className="space-y-2.5 pt-1">
          {isHost ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* CONTINUE GAME (won) or RESTART GAME (no winner) */}
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setConfirmDialog('new_round')}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-arcade-purple to-arcade-magenta hover:from-purple-500 hover:to-fuchsia-500 border border-fuchsia-300 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-neon-magenta flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${isProcessingAction ? 'animate-spin' : ''}`} />
                  <span>{isWon ? 'CONTINUE GAME' : 'RESTART GAME'}</span>
                </button>

                {/* END GAME -> Transitions to Results Screen */}
                {onEndGame && (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={onEndGame}
                    className="py-3 px-4 rounded-xl bg-arcade-surface hover:bg-arcade-card border border-arcade-border text-slate-200 hover:text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                  >
                    <Trophy className="w-4 h-4 text-arcade-gold" />
                    <span>END GAME</span>
                  </button>
                )}
              </div>

              {/* Destructive Host Control: END ROOM */}
              {onCloseRoom && (
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setConfirmDialog('close_room')}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-300 hover:text-red-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <DoorClosed className="w-3.5 h-3.5 text-red-400" />
                  <span>END ROOM</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-arcade-surface/60 border border-arcade-border text-xs text-arcade-muted flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-arcade-magenta animate-ping" />
                <span>Waiting for host to decide next match action...</span>
              </div>

              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2.5 px-4 rounded-xl bg-arcade-surface hover:bg-arcade-card border border-arcade-border text-xs text-slate-400 hover:text-white font-bold flex items-center justify-center gap-2 transition"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Leave Match</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Interactive3DStage>

      {/* Confirmation Modal for Destructive Actions (No browser alert) */}
      <AnimatePresence>
        {confirmDialog && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              {confirmDialog === 'close_room' ? (
                <>
                  <h3 id="confirm-dialog-title" className="text-lg font-black text-white uppercase">
                    Close this room?
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This will disconnect the current game session for all players.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmDialog(null)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog(null);
                        onCloseRoom?.();
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase shadow-lg shadow-red-900/40"
                    >
                      CLOSE ROOM
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 id="confirm-dialog-title" className="text-lg font-black text-white uppercase">
                    Start a new round?
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Current round results will be saved into round history. All players and boards are preserved.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmDialog(null)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog(null);
                        if (isWon) {
                          onContinue?.();
                        } else {
                          onRestart?.();
                        }
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-arcade-purple to-arcade-magenta text-white font-extrabold text-xs uppercase shadow-neon-magenta"
                    >
                      {isWon ? 'CONTINUE' : 'RESTART'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
