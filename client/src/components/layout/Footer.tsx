import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Radio } from 'lucide-react';

export function Footer() {
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith('/game');

  // In active match view, render a super sleek minimal bar to maximize arena screen real estate
  if (isGameRoute) {
    return (
      <footer className="w-full border-t border-arcade-border/40 bg-arcade-bg/90 py-2.5 px-4 text-[11px] text-arcade-muted backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-white">BINGO ARENA</span>
            <span className="text-slate-500">•</span>
            <span>Live Multiplayer Match</span>
          </div>
          <div className="text-slate-500">
            © 2026 Bingo Arena. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-arcade-border/70 bg-arcade-bg/95 backdrop-blur-md mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-arcade-border/50">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-arcade-purple to-arcade-magenta flex items-center justify-center shadow-neon-purple">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-amber-300">
                BINGO ARENA
              </span>
              <p className="text-[10px] text-arcade-muted uppercase font-bold tracking-widest -mt-0.5">
                Real-Time Multiplayer Arcade
              </p>
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="flex items-center flex-wrap justify-center gap-6 text-xs font-semibold">
            <Link to="/" className="text-arcade-muted hover:text-white transition">
              Home
            </Link>
            <Link to="/create" className="text-arcade-muted hover:text-arcade-magenta transition">
              Create Room
            </Link>
            <Link to="/join" className="text-arcade-muted hover:text-arcade-gold transition">
              Join Game
            </Link>
            <Link to="/results" className="text-arcade-muted hover:text-fuchsia-300 transition">
              Podium
            </Link>
          </nav>

          {/* Live Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Server Authoritative • Live Sync</span>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Bingo Arena. Created for competitive multiplayer fun.</p>
          <div className="flex items-center gap-2">
            <span>Powered by Node + Socket.IO + React</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
