import { motion, type Variants } from 'framer-motion';

const LETTERS = [
  { char: 'B', color: '#7C3AED', glow: 'rgba(124, 58, 237, 0.5)', label: 'Board' },
  { char: 'I', color: '#D946EF', glow: 'rgba(217, 70, 239, 0.5)', label: 'Interact' },
  { char: 'N', color: '#EC4899', glow: 'rgba(236, 72, 153, 0.5)', label: 'Numbers' },
  { char: 'G', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)', label: 'Grid' },
  { char: 'O', color: '#F97316', glow: 'rgba(249, 115, 22, 0.5)', label: 'Outplay' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 14,
      stiffness: 180,
    },
  },
};

export function BingoLetters() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="inline-flex items-center justify-center gap-2 sm:gap-3 md:gap-4 my-4 select-none"
    >
      {LETTERS.map((item) => (
        <motion.div
          key={item.char}
          variants={itemVariants}
          whileHover={{
            y: -5,
            scale: 1.1,
            transition: { duration: 0.2 },
          }}
          whileTap={{ scale: 0.95 }}
          className="group relative cursor-pointer"
        >
          {/* Subtle Ambient Back Glow */}
          <div
            className="absolute inset-0 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
            style={{ backgroundColor: item.glow }}
          />

          {/* 3D-styled Arcade Letter Medallion */}
          <div
            className="relative w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all duration-300"
            style={{
              backgroundColor: '#13111C',
              borderColor: item.color,
              boxShadow: `0 8px 20px -4px rgba(0,0,0,0.8), 0 0 12px -2px ${item.glow}`,
            }}
          >
            {/* Specular Top Rim */}
            <div className="absolute top-1 inset-x-2 h-1 rounded-full bg-white/20" />

            {/* Letter Typography */}
            <span
              className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight"
              style={{ color: item.color }}
            >
              {item.char}
            </span>

            {/* Bottom dot accent */}
            <div
              className="w-1.5 h-1.5 rounded-full mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: item.color }}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
