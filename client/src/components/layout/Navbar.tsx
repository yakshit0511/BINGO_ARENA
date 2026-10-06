import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  PlusCircle,
  Users,
  Activity,
  Volume2,
  VolumeX,
  Menu,
  X,
  Grid3X3,
} from 'lucide-react';
import { checkServerHealth } from '../../lib/api';

export function Navbar() {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const location = useLocation();

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
            className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcade-purple rounded-xl"
            aria-label="Bingo Arena Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arcade-purple to-arcade-magenta flex items-center justify-center shadow-neon-purple group-hover:scale-105 transition-transform duration-200">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-amber-300 group-hover:brightness-125 transition">
                BINGO ARENA
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-arcade-muted -mt-0.5">
                3D Multiplayer Arcade
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-5" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-arcade-surface text-arcade-magenta border border-arcade-purple/50 shadow-sm'
                      : 'text-arcade-muted hover:text-white hover:bg-arcade-surface/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Sound Effects Toggle Placeholder */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Sound FX: ON (Click to mute)' : 'Sound FX: MUTED (Click to enable)'}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-arcade-surface border border-arcade-border text-arcade-muted hover:text-white hover:border-arcade-purple/40 transition"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-arcade-gold" />
                  <span className="hidden lg:inline text-[11px]">Audio: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="hidden lg:inline text-[11px]">Audio: MUTED</span>
                </>
              )}
            </button>

            {/* Server Status Badge */}
            <div
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-arcade-card border border-arcade-border text-xs"
              title="Backend Server Health Status"
            >
              <Activity className="w-3.5 h-3.5 text-arcade-muted" />
              <span className="text-arcade-muted text-[11px]">Server:</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  serverOnline === true
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                    : serverOnline === false
                    ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_#FBBF24]'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span
                className={`font-bold text-[11px] ${
                  serverOnline === true
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {serverOnline === true
                  ? 'ONLINE'
                  : serverOnline === false
                  ? 'WAKING SERVER...'
                  : 'CONNECTING...'}
              </span>
            </div>
          </nav>

          {/* Mobile Right Bar */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Mobile Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
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
