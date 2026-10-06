import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusCircle, Users, Sparkles, ChevronDown } from 'lucide-react';
import { BingoHero3D } from '../components/three/BingoHero3D';
import { BingoLetters } from '../components/landing/BingoLetters';
import { GameMockBoard } from '../components/landing/GameMockBoard';
import { FeatureGrid } from '../components/landing/FeatureGrid';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/layout/PageTransition';

export function HomePage() {
  const scrollToPreview = () => {
    document.getElementById('arena-preview')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageTransition className="flex flex-col items-center">
      {/* ========================================================================= */}
      {/* HERO SECTION WITH IMMERSIVE 3D BINGO BALL ENVIRONMENT */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 md:py-20 overflow-hidden">
        {/* Full-bleed 3D Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <BingoHero3D />
        </div>

        {/* Ambient Radial Color Spotlights */}
        <div className="absolute -top-32 -left-32 w-80 sm:w-96 h-80 sm:h-96 bg-arcade-purple/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 sm:w-96 h-80 sm:h-96 bg-arcade-magenta/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-arcade-gold/10 rounded-full blur-[160px] pointer-events-none" />

        {/* Foreground Hero Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto w-full text-center flex flex-col items-center pointer-events-none">
          {/* Subtle Staged Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arcade-card/90 border border-arcade-purple/40 text-xs sm:text-sm font-semibold text-fuchsia-300 mb-4 shadow-neon-purple backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-arcade-gold" />
            <span>Turn-Based Real-Time Number Grid Combat</span>
          </motion.div>

          {/* Animated 3D B-I-N-G-O Letters */}
          <div className="pointer-events-auto">
            <BingoLetters />
          </div>

          {/* Main Title Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase drop-shadow-lg"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-amber-300">
              BINGO ARENA
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-3 text-base sm:text-2xl font-black tracking-wider text-slate-200 uppercase"
          >
            CREATE. PLAY. CALL. COMPLETE.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-3 text-xs sm:text-base text-arcade-muted max-w-lg leading-relaxed"
          >
            Join up to 30 players in high-stakes dynamic N×N grid battles. Call sequential numbers, complete custom winning words, and conquer the leaderboard.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="pointer-events-auto mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md px-4"
          >
            <Link to="/create" className="w-full sm:w-auto flex-1">
              <Button
                variant="primary"
                size="lg"
                className="w-full text-base font-extrabold shadow-neon-magenta"
                leftIcon={<PlusCircle className="w-5 h-5" />}
              >
                CREATE GAME
              </Button>
            </Link>

            <Link to="/join" className="w-full sm:w-auto flex-1">
              <Button
                variant="secondary"
                size="lg"
                className="w-full text-base font-extrabold"
                leftIcon={<Users className="w-5 h-5 text-arcade-gold" />}
              >
                JOIN GAME
              </Button>
            </Link>
          </motion.div>

          {/* Micro hint to scroll down */}
          <motion.button
            onClick={scrollToPreview}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75, y: [0, 6, 0] }}
            transition={{
              opacity: { delay: 0.7, duration: 0.5 },
              y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="pointer-events-auto mt-12 sm:mt-16 flex flex-col items-center gap-1 text-xs text-arcade-muted hover:text-white transition focus:outline-none"
            aria-label="Scroll down to arena preview"
          >
            <span>Explore Arena System</span>
            <ChevronDown className="w-4 h-4 text-arcade-magenta" />
          </motion.button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: INTERACTIVE GAME PREVIEW (MOCK BINGO BOARD) */}
      {/* ========================================================================= */}
      <section id="arena-preview" className="w-full py-12 border-t border-arcade-border/40">
        <div className="text-center max-w-2xl mx-auto px-4 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-semibold text-amber-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
            <span>Gameplay Interface Preview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            The Multiplayer <span className="text-gradient-gold">Arena Floor</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-arcade-muted">
            Inspect a live match snapshot: 5×5 numbered matrix, turn-by-turn calling, and live winning-word completion tracking.
          </p>
        </div>

        <GameMockBoard />
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: GAME ARCHITECTURE & FEATURE PREVIEW */}
      {/* ========================================================================= */}
      <section className="w-full border-t border-arcade-border/40">
        <FeatureGrid />
      </section>
    </PageTransition>
  );
}
