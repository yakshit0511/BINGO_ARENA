import { motion } from 'framer-motion';
import {
  Grid3X3,
  LayoutGrid,
  Radio,
  Type,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TiltCard } from '../ui/TiltCard';

const FEATURES = [
  {
    icon: Grid3X3,
    title: 'Dynamic Grid Sizes',
    subtitle: '5×5 up to 10×10+ Arenas',
    description:
      'Scale the battlefield from classic 25-number blitzes to massive 100-number endurance arenas with sequential matrices.',
    glow: 'gold' as const,
    iconColor: 'text-arcade-gold',
    borderColor: 'border-arcade-gold/30',
  },
  {
    icon: LayoutGrid,
    title: 'Player-Created Boards',
    subtitle: 'Personalized Matrix Layouts',
    description:
      'Arrange your numbers manually or shuffle with one click. Every player enters the arena with a distinct layout.',
    glow: 'magenta' as const,
    iconColor: 'text-arcade-magenta',
    borderColor: 'border-arcade-magenta/30',
  },
  {
    icon: Radio,
    title: 'Turn-Based Calling',
    subtitle: 'Synchronized Turn Rotation',
    description:
      'Players take turns calling numbers with strict turn timers. Real-time Socket.IO broadcasts ensure zero latency.',
    glow: 'purple' as const,
    iconColor: 'text-purple-400',
    borderColor: 'border-arcade-purple/30',
  },
  {
    icon: Type,
    title: 'Custom Winning Words',
    subtitle: 'BINGO, ARENA, or Custom',
    description:
      'Define any target word. Each letter corresponds to a completed row, column, or diagonal line needed to claim victory.',
    glow: 'gold' as const,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-400/30',
  },
  {
    icon: Users,
    title: 'Real-Time Multiplayer',
    subtitle: '5 to 30 Players per Room',
    description:
      'Built for community tournaments and party play with host controls, live spectator slots, and real-time scoreboards.',
    glow: 'magenta' as const,
    iconColor: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-400/30',
  },
  {
    icon: ShieldCheck,
    title: 'Server-Authoritative',
    subtitle: 'Anti-Cheat Line Detection',
    description:
      'Client never dictates game truth. All line completions, called numbers, and winner declarations are verified server-side.',
    glow: 'purple' as const,
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-400/30',
  },
];

export function FeatureGrid() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arcade-surface border border-arcade-border text-xs font-semibold text-arcade-magenta mb-3">
          <Sparkles className="w-3.5 h-3.5 text-arcade-gold" />
          <span>Next-Gen Multiplayer Architecture</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Engineered for <span className="text-gradient-purple-magenta">Competitive Play</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-arcade-muted">
          A modern re-imagination of number grid competition featuring deep tactical decisions, custom rules, and zero-compromise server authority.
        </p>
      </div>

      {/* Grid of 6 TiltCards */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <motion.div key={feat.title} variants={item}>
              <TiltCard
                glowColor={feat.glow}
                className="h-full p-6 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl bg-arcade-surface border ${feat.borderColor} flex items-center justify-center mb-4 shadow-sm`}
                  >
                    <Icon className={`w-6 h-6 ${feat.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    {feat.title}
                  </h3>
                  <div className="text-xs font-semibold text-arcade-magenta mb-2">
                    {feat.subtitle}
                  </div>
                  <p className="text-xs sm:text-sm text-arcade-muted leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
