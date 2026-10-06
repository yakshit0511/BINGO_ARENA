import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface BingoBoardProps {
  gridSize: number;
  cells: (number | null)[];
  onCellClick: (index: number) => void;
  nextNumber: number | null;
  isLocked: boolean;
  className?: string;
}

export function BingoBoard({
  gridSize,
  cells,
  onCellClick,
  nextNumber,
  isLocked,
  className = '',
}: BingoBoardProps) {
  // Determine dynamic cell dimension classes based on grid size
  const getCellDimensions = () => {
    if (gridSize <= 5) {
      return 'w-11 h-11 sm:w-14 sm:h-14 text-sm sm:text-lg';
    }
    if (gridSize <= 6) {
      return 'w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-base';
    }
    if (gridSize <= 7) {
      return 'w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm';
    }
    if (gridSize <= 8) {
      return 'w-8 h-8 sm:w-10 sm:h-10 text-[11px] sm:text-xs';
    }
    if (gridSize <= 10) {
      return 'w-7 h-7 sm:w-9 sm:h-9 text-[10px] sm:text-xs';
    }
    // Very large grids (11-20)
    return 'w-6 h-6 sm:w-8 sm:h-8 text-[9px] sm:text-[11px]';
  };

  const cellDimClass = getCellDimensions();

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Board Matrix Container with subtle arcade border & perspective */}
      <div className="max-w-full overflow-x-auto overflow-y-hidden p-3 sm:p-5 rounded-2xl bg-arcade-card/90 border-2 border-arcade-border shadow-arcade-card backdrop-blur-md">
        <div
          className="grid gap-1.5 sm:gap-2 justify-center mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((value, index) => {
            const isFilled = value !== null;
            const canClick = !isFilled && !isLocked && nextNumber !== null;

            return (
              <button
                key={index}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  if (canClick) {
                    onCellClick(index);
                  }
                }}
                className={`
                  group relative flex items-center justify-center font-mono font-black rounded-lg sm:rounded-xl transition-all duration-150 touch-manipulation
                  ${cellDimClass}
                  ${
                    isFilled
                      ? 'bg-gradient-to-br from-arcade-purple via-fuchsia-900 to-slate-900 border-2 border-fuchsia-400/60 text-white shadow-[0_0_12px_rgba(217,70,239,0.3)] cursor-default'
                      : isLocked
                      ? 'bg-arcade-surface/40 border border-arcade-border/40 text-arcade-muted/30 cursor-not-allowed'
                      : 'bg-arcade-surface/80 hover:bg-arcade-surface active:scale-95 border border-arcade-border hover:border-arcade-purple/70 text-slate-400 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                  }
                `}
              >
                {/* Number Content */}
                {isFilled ? (
                  <motion.span
                    initial={{ scale: 0.65, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="drop-shadow-md select-none"
                  >
                    {value}
                  </motion.span>
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
