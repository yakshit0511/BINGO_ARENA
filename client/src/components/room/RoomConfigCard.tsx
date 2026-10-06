import { GameConfig } from '../../types';
import { Grid3X3, Trophy, Users, Radio, ShieldCheck } from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';

interface RoomConfigCardProps {
  config: GameConfig;
  className?: string;
  isHost?: boolean;
  onToggleMarkingMode?: (mode: 'auto' | 'manual') => void;
}

export function RoomConfigCard({ config, className = '', isHost = false, onToggleMarkingMode }: RoomConfigCardProps) {
  const totalNumbers = config.gridSize * config.gridSize;

  return (
    <TiltCard elevated glowColor="purple" className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-arcade-border/80">
        <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-arcade-purple" />
          <span>Room Rulebook</span>
        </h3>
        <span className="px-2.5 py-0.5 rounded-full bg-arcade-surface border border-arcade-purple/40 text-[11px] font-bold text-arcade-magenta">
          Configured
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Matrix Dimensions */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1 mb-1">
            <Grid3X3 className="w-3 h-3 text-arcade-purple" />
            <span>Dimensions</span>
          </div>
          <div className="text-base font-black text-white">
            {config.gridSize} × {config.gridSize}
          </div>
          <div className="text-[11px] text-arcade-gold font-mono">
            {totalNumbers} numbers (1–{totalNumbers})
          </div>
        </div>

        {/* Winning Word */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1 mb-1">
            <Trophy className="w-3 h-3 text-arcade-gold" />
            <span>Winning Word</span>
          </div>
          <div className="text-base font-black text-fuchsia-300 font-mono tracking-wider">
            {config.winningWord}
          </div>
          <div className="text-[11px] text-arcade-muted">
            {config.winningWord.length}-letter objective
          </div>
        </div>

        {/* Player Cap */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1 mb-1">
            <Users className="w-3 h-3 text-arcade-magenta" />
            <span>Player Cap</span>
          </div>
          <div className="text-base font-black text-white">
            {config.playerLimit} Players
          </div>
          <div className="text-[11px] text-slate-400">
            Room maximum
          </div>
        </div>

        {/* Calling Mode */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1 mb-1">
            <Radio className="w-3 h-3 text-amber-400" />
            <span>Calling Mode</span>
          </div>
          <div className="text-sm font-black text-amber-300 uppercase">
            {config.callingMode}
          </div>
          <div className="text-[10px] text-arcade-muted line-clamp-1">
            {config.callingMode === 'turn-based' ? 'Rotating turns' : 'Server RNG'}
          </div>
        </div>

        {/* Host Status */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border">
          <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1 mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Host Role</span>
          </div>
          <div className="text-sm font-black text-white">
            {config.hostParticipates ? 'Host Plays' : 'Host Spectates'}
          </div>
          <div className="text-[10px] text-slate-400">
            {config.playerLimit} slots max
          </div>
        </div>

        {/* Marking Mode (Manual vs Auto) */}
        <div className="p-3 rounded-xl bg-arcade-surface/80 border border-arcade-border col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1">
              <span className="text-sm">🎯</span>
              <span>Marking Mode</span>
            </div>
            {isHost && onToggleMarkingMode && (
              <button
                type="button"
                onClick={() => onToggleMarkingMode(config.markingMode === 'manual' ? 'auto' : 'manual')}
                className="text-[10px] font-bold text-arcade-gold hover:text-yellow-300 underline underline-offset-2"
                title="Toggle Marking Mode"
              >
                Change
              </button>
            )}
          </div>
          <div className="text-sm font-black text-white flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config.markingMode === 'manual' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>{config.markingMode === 'manual' ? 'Manual Cross' : 'Auto-Daub'}</span>
          </div>
          <div className="text-[10px] text-arcade-muted">
            {config.markingMode === 'manual' 
              ? 'Players tap board to cross' 
              : 'Auto cross called numbers'}
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
