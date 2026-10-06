import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

interface BingoBoardProps {
  gridSize: number;
  cells: (number | null)[];
  onCellClick?: (index: number) => void;
  nextNumber?: number | null;
  isLocked: boolean;
  calledNumbers?: number[];
  completedLines?: string[];
  className?: string;
}

export function BingoBoard({
  gridSize,
  cells,
  onCellClick,
  nextNumber,
  isLocked,
  calledNumbers,
  completedLines,
  className = '',
}: BingoBoardProps) {
  // Efficient Set-based lookup for called numbers
  const calledSet = useMemo(() => new Set(calledNumbers || []), [calledNumbers]);

  // Compute set of cell indices that belong to completed lines
  const completedLineIndices = useMemo(() => {
    if (!completedLines || completedLines.length === 0) return new Set<number>();
    const indices = new Set<number>();
    const N = gridSize;

    for (const lineId of completedLines) {
      if (lineId.startsWith('row-')) {
        const r = parseInt(lineId.replace('row-', ''), 10);
        if (!isNaN(r) && r >= 0 && r < N) {
          for (let c = 0; c < N; c++) indices.add(r * N + c);
        }
      } else if (lineId.startsWith('column-')) {
        const c = parseInt(lineId.replace('column-', ''), 10);
        if (!isNaN(c) && c >= 0 && c < N) {
          for (let r = 0; r < N; r++) indices.add(r * N + c);
        }
      } else if (lineId === 'main-diagonal') {
        for (let i = 0; i < N; i++) indices.add(i * N + i);
      } else if (lineId === 'anti-diagonal') {
        for (let i = 0; i < N; i++) indices.add(i * N + (N - 1 - i));
      }
    }

    return indices;
  }, [completedLines, gridSize]);

  // Determine dynamic cell dimension classes based on grid size
  const getCellDimensions = () => {
    if (gridSize <= 5) {
      return 'w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] sm:w-14 sm:h-14 sm:min-w-[3.5rem] text-xs sm:text-lg';
    }
    if (gridSize <= 6) {
      return 'w-8 h-8 min-w-[2rem] min-h-[2rem] sm:w-12 sm:h-12 sm:min-w-[3rem] text-[11px] sm:text-base';
    }
    if (gridSize <= 7) {
      return 'w-7 h-7 min-w-[1.75rem] min-h-[1.75rem] sm:w-11 sm:h-11 sm:min-w-[2.75rem] text-[10px] sm:text-sm';
    }
    if (gridSize <= 8) {
      return 'w-6 h-6 min-w-[1.5rem] min-h-[1.5rem] sm:w-10 sm:h-10 sm:min-w-[2.5rem] text-[9px] sm:text-xs';
    }
    if (gridSize <= 10) {
      return 'w-5 h-5 min-w-[1.25rem] min-h-[1.25rem] sm:w-8 sm:h-8 sm:min-w-[2rem] text-[8px] sm:text-xs';
    }
    // Very large grids (11-20)
    return 'w-4 h-4 min-w-[1rem] min-h-[1rem] sm:w-7 sm:h-7 sm:min-w-[1.75rem] text-[7px] sm:text-[10px]';
  };

  const cellDimClass = getCellDimensions();

  return (
    <div className={`relative flex flex-col items-center select-none w-full ${className}`}>
      {/* Board Matrix Container with subtle arcade border & perspective */}
      <div className="max-w-full overflow-x-auto overflow-y-hidden p-2 sm:p-3.5 rounded-2xl bg-arcade-bg/80 border border-arcade-border/60 shadow-inner backdrop-blur-md">
        <div
          className="grid gap-1.5 sm:gap-2 justify-center mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((value, index) => {
            const isFilled = value !== null;
            const isCalled = isFilled && calledSet.has(value);
            const isLineComplete = isFilled && completedLineIndices.has(index);
            const canClick = !isFilled && !isLocked && nextNumber !== null && typeof onCellClick === 'function';

            return (
              <button
                key={index}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  if (canClick && onCellClick) {
                    onCellClick(index);
                  }
                }}
                className={`
                  group relative flex items-center justify-center font-mono font-black rounded-lg sm:rounded-xl transition-all duration-150 touch-manipulation
                  ${cellDimClass}
                  ${
                    isLineComplete
                      ? 'bg-gradient-to-br from-amber-300 via-orange-500 to-fuchsia-600 border-2 border-yellow-100 text-slate-950 font-black shadow-[0_0_25px_rgba(251,191,36,0.9),0_0_15px_rgba(217,70,239,0.7)] scale-[1.06] z-20 cursor-default animate-pulse'
                      : isCalled
                      ? 'bg-gradient-to-br from-amber-400 via-arcade-gold to-yellow-500 border-2 border-yellow-200 text-slate-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.65)] scale-[1.03] z-10 cursor-default'
                      : isFilled
                      ? 'bg-gradient-to-br from-arcade-purple via-fuchsia-900 to-slate-900 border-2 border-fuchsia-400/60 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)] cursor-default'
                      : isLocked
                      ? 'bg-arcade-surface/40 border border-arcade-border/40 text-arcade-muted/30 cursor-not-allowed'
                      : 'bg-arcade-surface/80 hover:bg-arcade-surface active:scale-95 border border-arcade-border hover:border-arcade-purple/70 text-slate-400 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                  }
                `}
              >
                {/* Number Content */}
                {isFilled ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative flex items-center justify-center"
                  >
                    <span className="drop-shadow-md select-none">{value}</span>
                    {isLineComplete ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                        <Sparkles className="w-3 h-3 text-amber-200 animate-spin" />
                      </span>
                    ) : isCalled ? (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-100 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-300" />
                      </span>
                    ) : null}
                  </motion.div>
                ) : (
                  <>
                    {/* Ghost preview of next number on desktop hover */}
                    {!isLocked && nextNumber !== null && (
                      <span className="hidden sm:inline-block opacity-0 group-hover:opacity-40 text-arcade-gold transition-opacity font-bold">
                        {nextNumber}
                      </span>
                    )}
                    {/* Subtle dot placeholder for empty cells */}
                    <span className="sm:group-hover:hidden w-1 h-1 rounded-full bg-arcade-border/60 pointer-events-none" />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Locked Overlay Badge if submitted */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-xs font-black text-emerald-300"
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>BOARD SUBMITTED & LOCKED</span>
        </motion.div>
      )}
    </div>
  );
}
