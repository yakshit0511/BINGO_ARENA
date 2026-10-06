import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Loader2, Sparkles, Clock } from 'lucide-react';

interface NumberCallerGridProps {
  gridSize: number;
  calledNumbers: number[];
  isMyTurn: boolean;
  currentCallerName: string;
  isProcessing: boolean;
  processingNumber: number | null;
  onCallNumber: (num: number) => void;
  className?: string;
}

export function NumberCallerGrid({
  gridSize,
  calledNumbers,
  isMyTurn,
  currentCallerName,
  isProcessing,
  processingNumber,
  onCallNumber,
  className = '',
}: NumberCallerGridProps) {
  const totalNumbers = gridSize * gridSize;

  // Pre-calculate called numbers set for O(1) checks
  const calledSet = useMemo(() => new Set(calledNumbers || []), [calledNumbers]);

  // Generate dynamic 1..N^2 numbers array
  const numbers = useMemo(() => {
    return Array.from({ length: totalNumbers }, (_, i) => i + 1);
  }, [totalNumbers]);

  // Compute remaining uncalled count
  const remainingCount = totalNumbers - calledSet.size;

  // Determine dynamic button sizing and column layout based on N
  const getGridColumnsClass = () => {
    if (gridSize <= 5) return 'grid-cols-5';
    if (gridSize <= 6) return 'grid-cols-6';
    if (gridSize <= 7) return 'grid-cols-7';
    if (gridSize <= 8) return 'grid-cols-8';
    if (gridSize <= 10) return 'grid-cols-10';
    return 'grid-cols-10'; // default for very large
  };

  const getButtonDimensions = () => {
    if (gridSize <= 5) return 'h-11 sm:h-12 text-sm sm:text-base';
    if (gridSize <= 6) return 'h-10 sm:h-11 text-xs sm:text-sm';
    if (gridSize <= 7) return 'h-9 sm:h-10 text-xs sm:text-sm';
    if (gridSize <= 8) return 'h-8 sm:h-9 text-[11px] sm:text-xs';
    if (gridSize <= 10) return 'h-7 sm:h-8 text-[10px] sm:text-xs';
    return 'h-7 sm:h-8 text-[10px]';
  };

  const gridColsClass = getGridColumnsClass();
  const btnDimClass = getButtonDimensions();

  return (
    <div className={`rounded-3xl bg-arcade-card/90 border-2 border-arcade-border p-5 sm:p-6 shadow-arcade-card space-y-4 ${className}`}>
      {/* Header with Turn Status & Remaining Counter */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-arcade-border/80 text-xs">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-arcade-gold" />
          <span className="font-extrabold text-white uppercase tracking-wider">
            NUMBER SELECTOR ({totalNumbers} NUMBERS)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-arcade-muted">
            REMAINING: <strong className="text-arcade-gold">{remainingCount}</strong> / {totalNumbers}
          </span>
        </div>
      </div>

      {/* Turn Action Banner */}
      {isMyTurn ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-2xl bg-gradient-to-r from-arcade-magenta/20 via-arcade-purple/20 to-amber-500/20 border border-arcade-magenta/50 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-arcade-magenta animate-ping" />
            <span className="font-black text-white uppercase tracking-wide">
              YOUR TURN: Click any uncalled number below to call it!
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-arcade-gold shrink-0" />
        </motion.div>
      ) : (
        <div className="p-3 rounded-2xl bg-arcade-surface/60 border border-arcade-border text-xs text-arcade-muted flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
          <span>
            Waiting for <strong className="text-white">{currentCallerName || 'active player'}</strong> to select a number...
          </span>
        </div>
      )}

      {/* Number Buttons Grid with Controlled Local Scroll for Large N */}
      <div className="max-h-[380px] overflow-y-auto overflow-x-hidden p-2 rounded-2xl bg-arcade-bg/80 border border-arcade-border/60 scrollbar-thin scrollbar-thumb-arcade-purple/50">
        <div className={`grid gap-1.5 sm:gap-2 ${gridColsClass}`}>
          {numbers.map((num) => {
            const isCalled = calledSet.has(num);
            const isThisProcessing = isProcessing && processingNumber === num;
            const canCall = isMyTurn && !isCalled && !isProcessing;

            return (
              <button
                key={num}
                type="button"
                disabled={!canCall}
                onClick={() => {
                  if (canCall) {
                    onCallNumber(num);
                  }
                }}
                className={`
                  relative font-mono font-black rounded-lg sm:rounded-xl transition-all duration-150 select-none flex items-center justify-center touch-manipulation
                  ${btnDimClass}
                  ${
                    isCalled
                      ? 'bg-arcade-surface/40 border border-arcade-border/40 text-arcade-muted/30 line-through cursor-not-allowed opacity-50'
                      : isThisProcessing
                      ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-200 animate-pulse cursor-wait'
                      : isMyTurn
                      ? 'bg-gradient-to-br from-arcade-purple/90 to-fuchsia-950 border-2 border-arcade-magenta/70 text-white hover:border-arcade-gold hover:shadow-neon-magenta hover:scale-105 active:scale-95 cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
                      : 'bg-arcade-surface/70 border border-arcade-border text-slate-400 cursor-not-allowed opacity-75'
                  }
                `}
                title={
                  isCalled
                    ? `Number ${num} already called`
                    : isMyTurn
                    ? `Call number ${num}`
                    : `Waiting for ${currentCallerName}'s turn`
                }
              >
                {isThisProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                ) : (
                  <span>{num}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle Hint */}
      <p className="text-[11px] text-center text-arcade-muted">
        {isMyTurn
          ? 'Selected number will be broadcast instantly and cannot be called again.'
          : 'Numbers are disabled until it is your turn in the rotation.'}
      </p>
    </div>
  );
}
