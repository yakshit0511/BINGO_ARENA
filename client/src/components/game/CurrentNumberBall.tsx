import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Radio } from 'lucide-react';

interface CurrentNumberBallProps {
  currentNumber: number | null;
  callerName: string | null;
  turnNumber: number;
  className?: string;
  compact?: boolean;
}

export function CurrentNumberBall({
  currentNumber,
  callerName,
  turnNumber,
  className = '',
  compact = false,
}: CurrentNumberBallProps) {
  const hasCalled = currentNumber !== null;

  if (compact) {
    return (
      <div
        className={`relative rounded-2xl bg-gradient-to-r from-arcade-card via-arcade-surface to-arcade-card border border-arcade-purple/50 p-2.5 sm:p-3 shadow-arcade-card flex items-center gap-3 overflow-hidden ${className}`}
      >
        {/* Ambient Pulsing Aura */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-24 h-24 bg-arcade-magenta/20 rounded-full blur-xl pointer-events-none" />

        {/* 3D Bingo Ball Shell (Compact Size) */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-arcade-purple/40 to-arcade-magenta/40 blur-md animate-pulse" />
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-1 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_2px_6px_rgba(255,255,255,0.6)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-arcade-bg to-slate-950 border-2 border-white/80 shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {hasCalled ? (
                  <motion.div
                    key={`${currentNumber}-${turnNumber}`}
                    initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="flex items-center justify-center select-none"
                  >
                    <span className="font-mono text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                      {currentNumber}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className="font-mono text-lg font-black text-slate-600">—</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Specular Highlight */}
            <div className="absolute top-1.5 left-2.5 w-4 h-2 rounded-full bg-white/40 blur-[1px] pointer-events-none -rotate-45" />
          </div>
        </div>

        {/* Info Column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-arcade-gold">
            <Radio className="w-3 h-3 text-arcade-magenta animate-pulse" />
            <span>CURRENT NUMBER</span>
          </div>
          <div className="text-xs text-slate-200 truncate mt-0.5">
            {hasCalled ? (
              <span className="flex items-center gap-1 text-slate-300">
                <User className="w-3 h-3 text-arcade-gold shrink-0" />
                <span className="truncate">
                  Called by <strong className="text-white font-bold">{callerName || 'Contender'}</strong>
                </span>
                <Sparkles className="w-3 h-3 text-arcade-gold shrink-0" />
              </span>
            ) : (
              <span className="text-arcade-muted italic text-[11px]">Awaiting first call</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl bg-gradient-to-br from-arcade-card via-arcade-surface to-arcade-card border-2 border-arcade-purple/60 p-6 sm:p-8 shadow-arcade-card text-center overflow-hidden ${className}`}
    >
      {/* Ambient Pulsing Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-arcade-magenta/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcade-bg/90 border border-arcade-border text-xs font-black uppercase tracking-widest text-arcade-gold mb-3">
          <Radio className="w-3.5 h-3.5 text-arcade-magenta animate-pulse" />
          <span>CURRENT NUMBER</span>
        </div>

        {/* 3D-Style Bingo Ball Visual Container */}
        <div className="relative my-3 flex items-center justify-center">
          {/* Subtle Outer Glow Rings */}
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-arcade-purple/40 to-arcade-magenta/40 blur-xl animate-pulse" />

          {/* Bingo Ball Shell */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(255,255,255,0.6)] flex items-center justify-center">
            {/* Inner Ball Inset */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-arcade-bg to-slate-950 border-4 border-white/80 shadow-[inset_0_8px_16px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {hasCalled ? (
                  <motion.div
                    key={`${currentNumber}-${turnNumber}`}
                    initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 22,
                    }}
                    className="flex flex-col items-center justify-center select-none"
                  >
                    <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] selection:bg-transparent">
                      {currentNumber}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <span className="font-mono text-4xl sm:text-5xl font-black text-slate-600">
                      —
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Specular 3D Highlight Reflection */}
            <div className="absolute top-3 left-6 w-12 h-6 sm:w-16 sm:h-8 rounded-full bg-white/35 blur-[2px] pointer-events-none -rotate-45" />
          </div>
        </div>

        {/* Caller Info Box */}
        <AnimatePresence mode="wait">
          {hasCalled ? (
            <motion.div
              key={callerName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arcade-surface/90 border border-arcade-purple/50 shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-arcade-gold" />
              <span className="text-xs text-arcade-muted">
                Called by:{' '}
                <strong className="text-white font-extrabold">{callerName || 'Contender'}</strong>
              </span>
              <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            </motion.div>
          ) : (
            <div className="mt-2 text-xs text-arcade-muted">
              Awaiting first number call in active rotation
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
