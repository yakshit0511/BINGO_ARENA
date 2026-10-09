import { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Sparkles } from 'lucide-react';
import { SUPPORTED_GRID_SIZES } from '../../constants';

interface GridSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
}

export function GridSizeSelector({ value, onChange }: GridSizeSelectorProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'classic' | 'pro'>('all');

  const filteredSizes = SUPPORTED_GRID_SIZES.filter((size) => {
    if (filterTab === 'classic') return size >= 5 && size <= 8;
    if (filterTab === 'pro') return size >= 9 && size <= 12;
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* Category Filter Pills for rapid navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-arcade-muted flex items-center gap-1.5">
          <Grid3X3 className="w-3.5 h-3.5 text-arcade-purple" />
          <span>Select Matrix Dimensions (5×5 to 12×12)</span>
        </label>

        <div className="inline-flex rounded-lg bg-arcade-bg/80 p-0.5 border border-arcade-border text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-md transition ${
              filterTab === 'all'
                ? 'bg-arcade-surface text-white shadow-sm'
                : 'text-arcade-muted hover:text-white'
            }`}
          >
            All (5–12)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('classic')}
            className={`px-2.5 py-1 rounded-md transition ${
              filterTab === 'classic'
                ? 'bg-arcade-surface text-white shadow-sm'
                : 'text-arcade-muted hover:text-white'
            }`}
          >
            Classic (5–8)
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('pro')}
            className={`px-2.5 py-1 rounded-md transition ${
              filterTab === 'pro'
                ? 'bg-arcade-surface text-white shadow-sm'
                : 'text-arcade-muted hover:text-white'
            }`}
          >
            Pro (9–12)
          </button>
        </div>
      </div>

      {/* Grid of Size Selectors */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
        {filteredSizes.map((size) => {
          const isSelected = value === size;
          const totalNumbers = size * size;

          return (
            <motion.button
              key={size}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(size)}
              className={`relative p-2.5 sm:p-3 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center ${
                isSelected
                  ? 'bg-gradient-to-br from-arcade-purple/40 to-arcade-magenta/40 border-arcade-magenta text-white shadow-neon-purple ring-1 ring-arcade-magenta/60'
                  : 'bg-arcade-bg/80 border-arcade-border text-slate-300 hover:border-arcade-purple/40 hover:bg-arcade-surface'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-tr from-arcade-gold to-arcade-orange flex items-center justify-center text-[10px] text-arcade-bg font-black shadow-sm">
                  ✓
                </div>
              )}
              <span className="text-xs sm:text-sm font-black tracking-tight">
                {size}×{size}
              </span>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 ${
                  isSelected ? 'text-amber-300' : 'text-arcade-muted'
                }`}
              >
                {totalNumbers} #s
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Supporting active information summary */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-arcade-surface/90 border border-arcade-border text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-arcade-gold" />
          <span className="text-arcade-muted">
            Active Dimension: <strong className="text-white font-mono">{value} × {value}</strong>
          </span>
        </div>
        <div className="font-mono text-arcade-magenta-light font-bold">
          {value * value} Sequential Numbers Required
        </div>
      </div>
    </div>
  );
}
