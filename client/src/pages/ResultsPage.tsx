import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import { TiltCard } from '../components/ui/TiltCard';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/layout/PageTransition';

export function ResultsPage() {
  return (
    <PageTransition className="max-w-2xl mx-auto px-4 py-12 w-full text-center">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-arcade-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Lobby</span>
      </Link>

      <TiltCard elevated glowColor="gold" className="p-8 sm:p-12">
        <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-6 shadow-neon-gold">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-semibold text-arcade-gold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Match Concluded</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wide">
          Victory Podium
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-arcade-muted max-w-md mx-auto">
          Winner announcements, line completion analytics, and game performance scorecards will display here upon match completion.
        </p>

        {/* Mock Podium Rank Preview */}
        <div className="my-8 grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto items-end">
          {/* Rank 2 */}
          <div className="p-3 sm:p-4 rounded-xl bg-arcade-surface/80 border border-arcade-border">
            <span className="text-xs font-bold text-slate-400">#2 Runner-Up</span>
            <div className="text-sm font-extrabold text-white mt-1">GridMaster</div>
            <div className="text-[10px] text-arcade-magenta mt-0.5">4 Letters</div>
          </div>

          {/* Rank 1 (Champion) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-t from-amber-500/20 to-arcade-surface border border-arcade-gold shadow-neon-gold">
            <span className="text-xs font-black text-arcade-gold uppercase tracking-wider">Champion</span>
            <div className="text-base font-black text-white mt-1">ApexCaller</div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">B-I-N-G-O!</div>
          </div>

          {/* Rank 3 */}
          <div className="p-3 sm:p-4 rounded-xl bg-arcade-surface/80 border border-arcade-border">
            <span className="text-xs font-bold text-slate-400">#3 Third</span>
            <div className="text-sm font-extrabold text-white mt-1">LuckySeven</div>
            <div className="text-[10px] text-arcade-purple mt-0.5">3 Letters</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/create" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={<Sparkles className="w-4 h-4 text-arcade-gold" />}
            >
              Play Another Match
            </Button>
          </Link>

          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              leftIcon={<RotateCcw className="w-4 h-4 text-arcade-muted" />}
            >
              Back to Home
            </Button>
          </Link>
        </div>
      </TiltCard>
    </PageTransition>
  );
}
