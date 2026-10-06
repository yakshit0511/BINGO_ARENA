import { motion } from 'framer-motion';
import { History, Sparkles } from 'lucide-react';
import { CallRecord } from '../../types';

interface RecentCallsListProps {
  lastCalledNumbers: CallRecord[];
  className?: string;
}

export function RecentCallsList({ lastCalledNumbers, className = '' }: RecentCallsListProps) {
  const calls = lastCalledNumbers || [];

  return (
    <div
      className={`rounded-3xl bg-arcade-card/90 border-2 border-arcade-border p-5 sm:p-6 shadow-arcade-card space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-arcade-border/80 text-xs">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-arcade-gold" />
          <span className="font-extrabold text-white uppercase tracking-wider">
            LAST 5 CALLS
          </span>
        </div>
        <span className="text-[11px] font-mono text-arcade-muted">
          {calls.length} / 5
        </span>
      </div>

      {calls.length === 0 ? (
        <div className="py-6 text-center text-xs text-arcade-muted italic">
          No numbers called yet in this match.
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((record, index) => {
            const isLatest = index === 0;

            return (
              <motion.div
                key={`${record.number}-${record.calledAt}-${index}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border transition-all ${
                  isLatest
                    ? 'bg-gradient-to-r from-arcade-purple/30 to-fuchsia-950/40 border-arcade-magenta/70 shadow-sm'
                    : 'bg-arcade-surface/60 border-arcade-border/60'
                }`}
              >
                {/* Number Badge & Caller */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm select-none ${
                      isLatest
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 shadow-neon-gold'
                        : 'bg-arcade-bg text-white border border-arcade-border'
                    }`}
                  >
                    {record.number}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{record.playerName || 'Contender'}</span>
                      {isLatest && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-arcade-magenta/25 border border-arcade-magenta/50 text-[9px] font-black text-fuchsia-300">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>LATEST</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-arcade-muted">
                      {new Date(record.calledAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Slot index indicator */}
                <span className="font-mono text-[10px] font-bold text-arcade-muted">
                  #{index + 1}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
