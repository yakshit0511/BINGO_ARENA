import { motion } from 'framer-motion';
import { GameConfig } from '../../types';
import { Trophy, Users, Shield } from 'lucide-react';

interface DynamicGridPreviewProps {
  config: GameConfig;
  hostName?: string;
}

export function DynamicGridPreview({ config, hostName }: DynamicGridPreviewProps) {
  const N = config.gridSize;
  const totalCells = N * N;
  const wordLetters = config.winningWord.split('');

  // Determine optimal cell appearance based on density
  const getCellSizeClass = () => {
    if (N <= 6) return 'h-10 text-xs';
    if (N <= 9) return 'h-8 text-[11px]';
    if (N <= 12) return 'h-6 text-[9px]';
    if (N <= 15) return 'h-5 text-[8px]';
    return 'h-4 text-[7px]';
  };

  return (
    <div className="w-full rounded-2xl bg-arcade-card border border-arcade-border p-4 sm:p-6 shadow-arcade-card relative overflow-hidden flex flex-col justify-between">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-arcade-purple/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Preview Status Bar */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-arcade-border/80 mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Live Arena Layout Preview
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-arcade-surface border border-arcade-border text-[11px] font-bold text-arcade-magenta">
              {config.callingMode.toUpperCase()}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-arcade-surface border border-arcade-border text-[11px] font-bold text-arcade-gold flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{config.playerLimit} Max</span>
            </span>
          </div>
        </div>

        {/* Winning Word Letters Ribbon */}
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-arcade-gold" />
              <span>Target Winning Word ({wordLetters.length} / {N} Letters)</span>
            </span>
            {wordLetters.length === N && (
              <span className="text-emerald-400 font-bold">✓ Matched</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: N }).map((_, idx) => {
              const char = wordLetters[idx] || '•';
              const isFilled = Boolean(wordLetters[idx]);

              return (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`w-7 h-8 sm:w-8 sm:h-9 rounded-lg flex items-center justify-center font-black text-xs sm:text-sm border transition-all ${
                    isFilled
                      ? 'bg-gradient-to-tr from-arcade-purple to-arcade-magenta text-white border-purple-400 shadow-neon-purple'
                      : 'bg-arcade-bg/60 text-slate-600 border-arcade-border border-dashed'
                  }`}
                >
                  {char}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Dynamic N×N Matrix Canvas */}
        <motion.div
          key={`grid-${N}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-xl bg-arcade-bg/95 p-3 sm:p-4 border border-arcade-purple/30 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]"
        >
          <div
            className="grid gap-1 sm:gap-1.5 w-full mx-auto"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: totalCells }).map((_, idx) => {
              const colIdx = idx % N;
              // Sample diagonal hint for visual flavor
              const isDiagonal = Math.floor(idx / N) === colIdx;

              return (
                <div
                  key={idx}
                  title={`Cell #${idx + 1}`}
                  className={`rounded-md border flex items-center justify-center font-mono font-bold select-none transition-all ${getCellSizeClass()} ${
                    isDiagonal
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                      : 'bg-arcade-surface/80 border-arcade-border/80 text-slate-400 hover:border-arcade-purple/50'
                  }`}
                >
                  {N <= 10 ? (
                    idx + 1
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-arcade-purple/60" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-arcade-border/60 flex items-center justify-between text-[11px] text-arcade-muted flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-arcade-purple" />
          <span>Host: <strong className="text-white">{hostName || 'Configuring'}</strong></span>
          <span>•</span>
          <span>{config.hostParticipates ? 'Participates' : 'Spectator Only'}</span>
        </div>
        <div className="font-mono text-arcade-gold font-bold">
          {N}×{N} Matrix • {totalCells} Numbers
        </div>
      </div>
    </div>
  );
}
