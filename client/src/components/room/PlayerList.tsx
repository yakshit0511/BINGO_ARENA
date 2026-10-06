import { motion } from 'framer-motion';
import { Crown, Users, CheckCircle2, Clock, Wifi, WifiOff, UserX } from 'lucide-react';
import { Player } from '../../types';

interface PlayerListProps {
  players: Player[];
  maxPlayers: number;
  currentUserId?: string;
  isHost?: boolean;
  onKickPlayer?: (playerId: string, playerName: string) => void;
  className?: string;
}

export function PlayerList({
  players,
  maxPlayers,
  currentUserId,
  isHost = false,
  onKickPlayer,
  className = '',
}: PlayerListProps) {
  return (
    <div className={`rounded-2xl bg-arcade-card border border-arcade-border p-4 sm:p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-arcade-border/80">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-arcade-magenta" />
          <h3 className="text-sm font-black text-white tracking-wide uppercase">
            Arena Players
          </h3>
        </div>
        <div className="px-2.5 py-0.5 rounded-full bg-arcade-surface border border-arcade-border text-xs font-mono font-bold text-arcade-gold">
          {players.length} / {maxPlayers} PLAYERS
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {players.map((player, index) => {
          const isYou = currentUserId ? player.id === currentUserId : false;
          const isOnline = player.isConnected !== false;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.25 }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                player.isHost
                  ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                  : isYou
                  ? 'bg-arcade-purple/15 border-arcade-purple/50'
                  : 'bg-arcade-surface/70 border-arcade-border'
              }`}
            >
              {/* Left Side: Avatar, Name & Badges */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                {/* Avatar with connection badge */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs text-white uppercase shadow-sm border border-white/10"
                    style={{
                      backgroundColor: player.avatarColor || '#7C3AED',
                    }}
                  >
                    {player.name.slice(0, 2)}
                  </div>
                  {/* Status dot */}
                  <span
                    title={isOnline ? 'Connected' : 'Disconnected / Reconnecting'}
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-arcade-card ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                </div>

                {/* Name and Indicators */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-white truncate max-w-[120px] sm:max-w-[160px]">
                      {player.name}
                    </span>

                    {/* YOU indicator */}
                    {isYou && (
                      <span className="px-1.5 py-0.2 rounded bg-arcade-purple/40 border border-arcade-purple/50 text-fuchsia-300 text-[10px] font-black tracking-wider">
                        YOU
                      </span>
                    )}

                    {/* HOST indicator */}
                    {player.isHost && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/60 text-[10px] font-black text-amber-300 shadow-sm">
                        <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                        <span>HOST</span>
                      </span>
                    )}
                  </div>

                  {/* Accessible Connection Status Text */}
                  <div className="flex items-center gap-1 text-[11px] text-arcade-muted mt-0.5">
                    {isOnline ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Wifi className="w-3 h-3" />
                        <span>Online</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400/80 font-medium">
                        <WifiOff className="w-3 h-3" />
                        <span>Offline (Reconnecting)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Board Readiness / Preparation Status & Host Kick */}
              <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold">
                {player.hasSubmitted ? (
                  <span className="flex items-center gap-1 text-emerald-300 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✓ Submitted</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-300/90 text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Preparing…</span>
                  </span>
                )}

                {/* Host Kick Option */}
                {isHost && !player.isHost && onKickPlayer && (
                  <button
                    type="button"
                    title={`Remove ${player.name} from room`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to remove ${player.name} from the room?`)) {
                        onKickPlayer(player.id, player.name);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-100 transition-colors ml-1 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Empty slots placeholders */}
        {Array.from({ length: Math.min(3, Math.max(0, maxPlayers - players.length)) }).map(
          (_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center justify-between p-3 rounded-xl border border-dashed border-arcade-border/60 bg-arcade-bg/40 text-xs text-slate-500"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border border-dashed border-arcade-border flex items-center justify-center text-[10px] text-arcade-muted">
                  +
                </div>
                <span>Waiting for player to join...</span>
              </div>
              <span className="text-[10px] font-mono text-arcade-muted">Open Slot</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
