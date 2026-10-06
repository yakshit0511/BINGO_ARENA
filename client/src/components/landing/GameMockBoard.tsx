import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Users, Radio } from 'lucide-react';

// Mock grid matrix matching prompt specification
const MOCK_GRID: number[][] = [
  [1, 17, 8, 23, 4],
  [12, 5, 19, 7, 25],
  [9, 21, 3, 14, 11],
  [16, 2, 24, 10, 18],
  [22, 13, 6, 15, 20],
];

// Mock called numbers forming a completed diagonal (1, 5, 3, 10, 20) plus extra calls
const MOCK_CALLED = new Set([1, 5, 3, 10, 20, 17, 7, 21, 24]);
const DIAGONAL_LINE = new Set(['0-0', '1-1', '2-2', '3-3', '4-4']);

export function GameMockBoard() {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Container with premium arcade bezel styling */}
      <div className="relative rounded-3xl bg-arcade-card border border-arcade-border p-4 sm:p-8 shadow-arcade-card overflow-hidden">
        {/* Subtle Ambient Radial Lighting Behind Board */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-arcade-purple/15 rounded-full blur-3xl pointer-events-none" />

        {/* Mock Match Top Header / HUD */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-arcade-border/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-arcade-surface border border-arcade-border text-xs">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="font-mono font-bold text-arcade-text tracking-wider">ROOM: ARENA-784</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-arcade-surface border border-arcade-border text-xs text-arcade-muted">
              <Users className="w-3.5 h-3.5 text-arcade-purple" />
              <span>12 Players In Arena</span>
            </div>
          </div>

          {/* Winning Word Letters Tracker */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-arcade-muted mr-1 hidden sm:inline">
              Progress:
            </span>
            {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => {
              const isCompleted = idx < 3; // First 3 lines completed (B, I, N)
              return (
                <div
                  key={letter}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs sm:text-sm border transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-tr from-arcade-gold to-arcade-orange text-arcade-bg border-amber-300 shadow-neon-gold scale-105'
                      : 'bg-arcade-bg/60 text-slate-500 border-arcade-border'
                  }`}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        </div>

        {/* Turn HUD Banner */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 mb-6 rounded-xl bg-arcade-surface/90 border border-arcade-purple/30 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-arcade-muted">
              Current Turn: <strong className="text-white">ApexCaller (Turn #14)</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-arcade-gold">
            <Sparkles className="w-4 h-4 text-arcade-gold" />
            <span>Last Number Called: <strong className="text-white bg-arcade-bg px-2 py-0.5 rounded border border-arcade-gold/40">#24</strong></span>
          </div>
        </div>

        {/* 5x5 Grid Board Interface */}
        <div className="relative z-10 max-w-md mx-auto aspect-square p-2.5 sm:p-4 rounded-2xl bg-arcade-bg/95 border-2 border-arcade-purple/40 shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)]">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 h-full">
            {MOCK_GRID.map((row, rIdx) =>
              row.map((num, cIdx) => {
                const cellKey = `${rIdx}-${cIdx}`;
                const isCalled = MOCK_CALLED.has(num);
                const isDiagonal = DIAGONAL_LINE.has(cellKey);
                const isHovered = hoveredCell === cellKey;

                return (
                  <motion.div
                    key={cellKey}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-lg select-none cursor-pointer border transition-all duration-200 ${
                      isDiagonal
                        ? 'bg-gradient-to-tr from-amber-500/25 to-orange-500/35 border-amber-400 text-amber-200 shadow-neon-gold'
                        : isCalled
                        ? 'bg-gradient-to-tr from-purple-600/30 to-fuchsia-600/30 border-purple-400/80 text-fuchsia-200 shadow-neon-purple'
                        : 'bg-arcade-surface/90 border-arcade-border text-slate-300 hover:border-purple-400/50 hover:bg-arcade-elevated'
                    }`}
                  >
                    {/* Number typography */}
                    <span className="relative z-10">{num}</span>

                    {/* Stamped checkmark / indicator for marked number */}
                    {isCalled && (
                      <div className="absolute inset-0 rounded-xl bg-purple-500/10 pointer-events-none flex items-center justify-center">
                        <div
                          className={`w-8 h-8 rounded-full border border-dashed opacity-40 pointer-events-none ${
                            isDiagonal ? 'border-amber-300' : 'border-fuchsia-400'
                          }`}
                        />
                      </div>
                    )}

                    {/* Interactive hover ripple */}
                    {isHovered && (
                      <motion.div
                        layoutId="mockCellHover"
                        className="absolute inset-0 rounded-xl bg-white/10 pointer-events-none"
                      />
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-6 text-center text-xs text-arcade-muted flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-arcade-gold" />
          <span>Interactive Preview: Highlighting completed diagonal winning line (1 - 5 - 3 - 10 - 20)</span>
        </div>
      </div>
    </div>
  );
}
