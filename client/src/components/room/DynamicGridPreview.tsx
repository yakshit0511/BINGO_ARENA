import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameConfig } from '../../types';
import { Eye, Maximize2, Minimize2, Users, Clock, Star } from 'lucide-react';

interface DynamicGridPreviewProps {
  config: GameConfig;
  hostName?: string;
}

export function DynamicGridPreview({ config }: DynamicGridPreviewProps) {
  const N = config.gridSize;
  const totalCells = N * N;
  const wordLetters = config.winningWord.split('');

  // Interactive user-clicked cells for preview interaction (Requirement 6)
  const [markedCells, setMarkedCells] = useState<Set<number>>(() => {
    // Default to main diagonal highlighted as in reference image (1, 7, 13, 19, 25)
    const initial = new Set<number>();
    for (let r = 0; r < Math.min(N, 10); r++) {
      initial.add(r * N + r);
    }
    return initial;
  });

  const [isZoomed, setIsZoomed] = useState(false);

  // Re-sync diagonal highlight when N changes
  useMemo(() => {
    const next = new Set<number>();
    for (let r = 0; r < Math.min(N, 10); r++) {
      next.add(r * N + r);
    }
    setMarkedCells(next);
  }, [N]);

  // Toggle cell clicked in preview
  const handleToggleCell = (idx: number) => {
    setMarkedCells((prev) => {
      const copy = new Set(prev);
      if (copy.has(idx)) {
        copy.delete(idx);
      } else {
        copy.add(idx);
      }
      return copy;
    });
  };

  // Determine cell sizing based on dimension density
  const getCellSizeClass = () => {
    if (N <= 5) return 'h-11 sm:h-12 text-sm sm:text-base font-black';
    if (N <= 7) return 'h-9 sm:h-10 text-xs sm:text-sm font-bold';
    if (N <= 10) return 'h-7 sm:h-8 text-[11px] font-semibold';
    if (N <= 14) return 'h-6 text-[9px] font-semibold';
    return 'h-5 text-[8px] font-medium';
  };

  return (
    <div className="w-full rounded-2xl bg-[#0e0c1c]/90 border border-purple-500/25 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(168,85,247,0.2)] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
      {/* Subtle background ambient purple beam */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Header: Eye icon + LIVE ARENA LAYOUT PREVIEW + Expand button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-purple-900/40 mb-4">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
              LIVE ARENA LAYOUT PREVIEW
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? 'Reset preview size' : 'Expand preview'}
            className="p-1.5 rounded-lg bg-[#1a1733] border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-500/60 transition cursor-pointer"
          >
            {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Target Winning Word Ribbon */}
        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
            <span>TARGET WINNING WORD ({N} LETTERS)</span>
            {wordLetters.length === N && (
              <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                ✓ Ready
              </span>
            )}
          </div>

          {/* Letter Chips (matching glowing purple square chips in reference image) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
            {Array.from({ length: N }).map((_, idx) => {
              const char = wordLetters[idx] || '•';
              const isFilled = Boolean(wordLetters[idx]);

              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm sm:text-base select-none shrink-0 border transition-all ${
                    isFilled
                      ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white border-purple-400/90 shadow-[0_0_15px_rgba(168,85,247,0.7)] ring-1 ring-purple-300/40'
                      : 'bg-[#151228] text-slate-500 border-purple-900/40 border-dashed'
                  }`}
                >
                  {char}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Dynamic N×N Interactive Matrix Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`arena-grid-${N}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`rounded-2xl bg-[#090714]/95 p-3 sm:p-4 border border-purple-900/50 shadow-[inset_0_4px_25px_rgba(0,0,0,0.9)] max-h-[460px] overflow-auto scrollbar-thin ${
              isZoomed ? 'scale-105 transition-transform' : ''
            }`}
          >
            <div
              className="grid gap-1.5 w-full mx-auto"
              style={{
                gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, idx) => {
                const isMarked = markedCells.has(idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleCell(idx)}
                    title={`Cell #${idx + 1} (Click to toggle)`}
                    className={`rounded-lg border flex items-center justify-center select-none cursor-pointer transition-all duration-150 ${getCellSizeClass()} ${
                      isMarked
                        ? 'bg-gradient-to-br from-amber-600/35 to-amber-700/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.55)] ring-1 ring-amber-400/60 font-black'
                        : 'bg-[#141228]/85 border-[#282245] text-slate-300 hover:border-purple-400/60 hover:bg-[#1f1b3d] hover:text-white'
                    }`}
                  >
                    {N <= 12 ? (
                      idx + 1
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${isMarked ? 'bg-amber-300' : 'bg-purple-500/50'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Status Pills (matches bottom pill badges in reference image) */}
      <div className="mt-5 pt-3.5 border-t border-purple-900/40 flex items-center justify-between flex-wrap gap-2 text-xs">
        {/* Players Limit */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141228] border border-purple-900/40 text-slate-300">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold">2 - {config.playerLimit} Players</span>
        </div>

        {/* Calling Mode */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141228] border border-purple-900/40 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold capitalize">
            {config.callingMode === 'turn-based' ? 'Turn-based' : 'Time-based'}
          </span>
        </div>

        {/* Marking Mode */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141228] border border-purple-900/40 text-slate-300">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-semibold capitalize">
            {config.markingMode === 'manual' ? 'Manual Marking' : 'Auto Marking'}
          </span>
        </div>
      </div>
    </div>
  );
}
