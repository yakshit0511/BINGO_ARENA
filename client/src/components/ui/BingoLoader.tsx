import { motion } from 'framer-motion';

export interface BingoLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BingoLoader({
  label = 'Synchronizing with Arena...',
  size = 'md',
  className = '',
}: BingoLoaderProps) {
  const sizeMap = {
    sm: { ball: 'w-8 h-8 text-xs', text: 'text-xs' },
    md: { ball: 'w-14 h-14 text-lg', text: 'text-sm' },
    lg: { ball: 'w-20 h-20 text-2xl', text: 'text-base' },
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* 3D-styled animated spinning Bingo ball indicator */}
      <div className="relative">
        <motion.div
          animate={{
            rotateY: [0, 180, 360],
            y: [-4, 4, -4],
          }}
          transition={{
            rotateY: { duration: 1.8, repeat: Infinity, ease: 'linear' },
            y: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
          }}
          className={`${sizeMap[size].ball} rounded-full bg-gradient-to-tr from-arcade-purple via-arcade-magenta to-arcade-gold p-1 shadow-neon-purple flex items-center justify-center`}
        >
          {/* Inner white lottery badge */}
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
            <span className="font-black text-arcade-bg tracking-tighter">
              B
            </span>
          </div>
        </motion.div>

        {/* Ambient shadow pulse under ball */}
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-10 h-2 bg-arcade-magenta/40 rounded-full blur-sm mx-auto mt-2"
        />
      </div>

      {label && (
        <span className={`font-semibold text-arcade-muted tracking-wide animate-pulse ${sizeMap[size].text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
