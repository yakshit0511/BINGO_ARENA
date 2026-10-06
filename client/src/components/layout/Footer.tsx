import { Sparkles, Shield, Cpu, Volume2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-arcade-border/60 bg-arcade-bg/95 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-arcade-muted">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white tracking-wide">BINGO ARENA</span>
            <span>•</span>
            <span>Next-Gen Multiplayer Grid Platform</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-arcade-purple" /> Node + Express
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-arcade-magenta" /> Three.js / R3F 3D
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-arcade-gold" /> Spatial FX Ready
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Server-Authoritative
            </span>
          </div>

          <div className="text-slate-500 text-center md:text-right">
            Real-Time Multiplayer Arcade • Live Production
          </div>
        </div>
      </div>
    </footer>
  );
}
