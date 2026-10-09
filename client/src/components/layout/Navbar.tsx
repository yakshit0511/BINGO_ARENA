import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  PlusCircle,
  Users,
  Volume2,
  VolumeX,
  Menu,
  X,
  Grid3X3,
} from 'lucide-react';
import { checkServerHealth } from '../../lib/api';
import { soundManager } from '../../lib/sound';

export function Navbar() {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isSoundEnabled());
  const location = useLocation();

  const handleToggleSound = () => {
    const next = soundManager.toggleSound();
    setSoundEnabled(next);
  };

  useEffect(() => {
    let isMounted = true;
    checkServerHealth().then((res) => {
      if (isMounted) setServerOnline(res.success);
    });

    const interval = setInterval(() => {
      checkServerHealth().then((res) => {
        if (isMounted) setServerOnline(res.success);
      });
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { label: 'Create Room', path: '/create', icon: PlusCircle },
    { label: 'Join Game', path: '/join', icon: Users },
    { label: 'Arena Floor', path: '/game', icon: Grid3X3 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-arcade-border/80 bg-arcade-bg/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <Link
            to="/"
            className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl"
            aria-label="Bingo Arena Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-transform duration-200">
              <span className="text-xl">🏆</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-wider text-white group-hover:text-cyan-300 transition">
                BINGO ARENA
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 -mt-0.5">
                3D MULTIPLAYER BINGO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-3" aria-label="Main Navigation">
            {/* Create Room Pill Button */}
            <Link
              to="/create"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                location.pathname === '/create'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                  : 'bg-arcade-surface/90 text-slate-300 border border-arcade-border hover:border-purple-500/50 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-purple-300" />
              <span>Create Room</span>
            </Link>

            {/* Join Game Pill Button */}
            <Link
              to="/join"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                location.pathname === '/join'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                  : 'bg-arcade-surface/90 text-slate-300 border border-arcade-border hover:border-purple-500/50 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span>Join Game</span>
            </Link>

            {/* Arena Floor Pill Button */}
            <Link
              to="/game"
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                location.pathname.startsWith('/game') && location.pathname !== '/create'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                  : 'bg-arcade-surface/90 text-slate-300 border border-arcade-border hover:border-purple-500/50 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4 text-amber-400" />
              <span>Arena Floor</span>
            </Link>

            {/* Sound Effects Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Sound FX: ON (Click to mute)' : 'Sound FX: MUTED (Click to enable)'}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-arcade-surface/90 border border-arcade-border text-slate-300 hover:text-white hover:border-purple-500/40 transition"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-[11px] font-bold">Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] font-bold">Audio Muted</span>
                </>
              )}
            </button>

            {/* Server Status Pill (Online with green beacon matching reference image) */}
            <div
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-arcade-surface/90 border border-arcade-border text-xs"
              title="Arena Network Status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  serverOnline === false
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 shadow-[0_0_10px_#10B981]'
                }`}
              />
              <span className="font-bold text-[11px] text-emerald-400">
                {serverOnline === false ? 'Connecting' : 'Online'}
              </span>
              <span className="text-arcade-muted text-[10px]">▾</span>
            </div>
          </nav>

          {/* Mobile Right Bar */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Mobile Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-arcade-surface border border-arcade-border text-arcade-muted hover:text-white"
              aria-label="Toggle sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-arcade-gold" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>

            {/* Mobile Server Ping */}
            <div className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-arcade-card border border-arcade-border text-[10px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverOnline === true ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-arcade-muted font-bold">
                {serverOnline ? 'ONLINE' : '...'}
              </span>
            </div>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-arcade-surface border border-arcade-border text-arcade-muted hover:text-white focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-arcade-border bg-arcade-card/95 px-4 pt-3 pb-5 space-y-2.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-arcade-purple/20 text-arcade-magenta border border-arcade-purple/50'
                    : 'text-slate-300 hover:bg-arcade-surface'
                }`}
              >
                <Icon className="w-5 h-5 text-arcade-magenta" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
