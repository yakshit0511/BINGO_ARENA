import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Sparkles } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Dimension Section Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-purple-400" />
          <span>SELECT MATRIX DIMENSIONS (5×5 TO 12×12)</span>
        </label>
      </div>

      {/* Grid of Matrix Dimension Cards (8 cards 5x5 to 12x12) */}
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {filteredSizes.map((size) => {
          const isSelected = value === size;
          const totalTiles = size * size;
          const isClassic = size === 5;

          return (
            <motion.button
              key={size}
              type="button"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(size)}
              className={`relative py-3 px-2 sm:px-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer select-none ${
                isSelected
                  ? 'bg-gradient-to-b from-purple-900/60 to-indigo-950/80 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.55)] ring-1 ring-purple-400'
                  : 'bg-[#100e20]/80 border-[#282245] text-slate-300 hover:border-purple-500/50 hover:bg-[#181530] hover:text-white'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-[10px] text-black font-black shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                  ✓
                </div>
              )}

              <span className="text-sm sm:text-base font-black tracking-tight text-white">
                {size}×{size}
              </span>

              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                  isSelected
                    ? 'text-cyan-300 font-bold'
                    : isClassic
                    ? 'text-purple-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {isClassic && filterTab === 'all' ? 'Classic' : `${totalTiles} tiles`}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'all'
              ? 'bg-purple-600/80 border border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-[#141226]/90 border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-600/40'
          }`}
        >
          All (5-12)
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('classic')}
          className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'classic'
              ? 'bg-purple-600/80 border border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-[#141226]/90 border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-600/40'
          }`}
        >
          Classic (5-8)
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('pro')}
          className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'pro'
              ? 'bg-purple-600/80 border border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-[#141226]/90 border border-purple-900/40 text-slate-400 hover:text-white hover:border-purple-600/40'
          }`}
        >
          Pro (9-12)
        </button>
      </div>

      {/* Selected Matrix Summary Badge */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#121024]/70 border border-purple-900/30 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Active Arena: <strong className="text-white font-mono">{value} × {value}</strong></span>
        </div>
        <div className="font-mono text-cyan-300 font-semibold">
          {value * value} Total Tiles
        </div>
      </div>
    </div>
  );
}
