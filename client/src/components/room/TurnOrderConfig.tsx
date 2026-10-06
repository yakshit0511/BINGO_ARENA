import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Crown, Shield, ArrowUpDown, Sparkles } from 'lucide-react';
import { Player } from '../../types';
import { soundManager } from '../../lib/sound';

interface TurnOrderConfigProps {
  players: Player[];
  hostPlayerId: string;
  currentUserId: string;
  isHost: boolean;
  configuredOrder?: string[];
  onOrderChange: (newOrder: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TurnOrderConfig({
  players,
  hostPlayerId,
  currentUserId,
  isHost,
  configuredOrder,
  onOrderChange,
  disabled = false,
  className = '',
}: TurnOrderConfigProps) {
  // Ordered player IDs
  const [order, setOrder] = useState<string[]>(() => {
    if (configuredOrder && configuredOrder.length === players.length) {
      // Validate all IDs belong
      const playerIds = new Set(players.map((p) => p.id));
      if (configuredOrder.every((id) => playerIds.has(id))) {
        return configuredOrder;
      }
    }
    // Default order: host first, then others in join order
    const host = players.find((p) => p.id === hostPlayerId);
    const nonHosts = players.filter((p) => p.id !== hostPlayerId);
    return host ? [host.id, ...nonHosts.map((p) => p.id)] : players.map((p) => p.id);
  });

  // Keep internal order in sync if external configuredOrder or players change
  useEffect(() => {
    if (configuredOrder && configuredOrder.length === players.length) {
      const playerIds = new Set(players.map((p) => p.id));
      if (configuredOrder.every((id) => playerIds.has(id))) {
        setOrder(configuredOrder);
        return;
      }
    }

    // If order has missing or extra players, reconcile
    const existingSet = new Set(order);
    const playerIds = players.map((p) => p.id);
    const isMatching = playerIds.length === order.length && playerIds.every((id) => existingSet.has(id));

    if (!isMatching) {
      const remaining = playerIds.filter((id) => !existingSet.has(id));
      const validExisting = order.filter((id) => playerIds.includes(id));
      setOrder([...validExisting, ...remaining]);
    }
  }, [configuredOrder, players]);

  // Handle Move Up
  const handleMoveUp = (index: number) => {
    if (!isHost || disabled || index <= 0) return;
    soundManager.playButtonClick();
    const newOrder = [...order];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setOrder(newOrder);
    onOrderChange(newOrder);
  };

  // Handle Move Down
  const handleMoveDown = (index: number) => {
    if (!isHost || disabled || index >= order.length - 1) return;
    soundManager.playButtonClick();
    const newOrder = [...order];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setOrder(newOrder);
    onOrderChange(newOrder);
  };

  const playerMap = new Map(players.map((p) => [p.id, p]));

  return (
    <div className={`rounded-2xl bg-arcade-card border border-arcade-border p-5 space-y-4 shadow-arcade-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-arcade-border/80 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-arcade-purple/20 border border-arcade-purple/40 flex items-center justify-center text-arcade-gold">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5">
              <span>TURN ORDER CONFIGURATION</span>
              <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            </h3>
            <p className="text-[11px] text-arcade-muted">
              {isHost
                ? 'Reorder players using the up/down arrows to decide who calls first.'
                : 'Turn calling sequence configured by room host.'}
            </p>
          </div>
        </div>

        <div>
          {isHost ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] font-black text-amber-300">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>HOST CONTROLS ACTIVE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-arcade-surface border border-arcade-border text-[10px] font-bold text-arcade-muted">
              <Shield className="w-3 h-3 text-arcade-purple" />
              <span>VIEW ONLY</span>
            </span>
          )}
        </div>
      </div>

      {/* Roster of Players in Turn Order */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {order.map((playerId, index) => {
            const player = playerMap.get(playerId);
            if (!player) return null;

            const isYou = player.id === currentUserId;
            const isFirst = index === 0;
            const isLast = index === order.length - 1;

            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isFirst
                    ? 'bg-gradient-to-r from-arcade-purple/25 via-arcade-card to-arcade-surface border-arcade-purple/60 shadow-neon-purple'
                    : isYou
                    ? 'bg-arcade-surface/90 border-arcade-border-accent'
                    : 'bg-arcade-surface/60 border-arcade-border'
                }`}
              >
                {/* Left: Position Rank, Avatar & Name */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Position Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      isFirst
                        ? 'bg-arcade-gold text-black shadow-neon-gold'
                        : 'bg-arcade-bg/80 text-arcade-muted border border-arcade-border'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Player Name & Badges */}
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[180px]">
                      {player.name}
                    </span>

                    {player.isHost && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
                        <Crown className="w-2.5 h-2.5" />
                        <span>HOST</span>
                      </span>
                    )}

                    {isYou && (
                      <span className="px-1.5 py-0.5 rounded bg-arcade-purple/30 text-fuchsia-300 text-[10px] font-black">
                        YOU
                      </span>
                    )}

                    {isFirst && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                        Calls 1st
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Host Up/Down Controls */}
                {isHost && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={disabled || isFirst}
                      onClick={() => handleMoveUp(index)}
                      title="Move Up"
                      className={`p-1.5 rounded-lg border transition ${
                        disabled || isFirst
                          ? 'opacity-30 cursor-not-allowed border-arcade-border/30 bg-arcade-bg/30 text-slate-500'
                          : 'bg-arcade-surface hover:bg-arcade-purple/30 active:scale-95 border-arcade-border hover:border-arcade-purple text-white'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={disabled || isLast}
                      onClick={() => handleMoveDown(index)}
                      title="Move Down"
                      className={`p-1.5 rounded-lg border transition ${
                        disabled || isLast
                          ? 'opacity-30 cursor-not-allowed border-arcade-border/30 bg-arcade-bg/30 text-slate-500'
                          : 'bg-arcade-surface hover:bg-arcade-purple/30 active:scale-95 border-arcade-border hover:border-arcade-purple text-white'
                      }`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Rotation Notice */}
      <div className="p-3 rounded-xl bg-arcade-bg/70 border border-arcade-border text-[11px] text-arcade-muted flex items-center justify-between">
        <span>Rotation sequence:</span>
        <span className="font-mono text-arcade-gold font-bold">
          {order.map((id) => playerMap.get(id)?.name || id).join(' → ')} → (repeat)
        </span>
      </div>
    </div>
  );
}
