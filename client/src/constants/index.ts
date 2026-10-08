import { CallingMode } from '../types';

export const APP_NAME = 'Bingo Arena';
export const APP_TAGLINE = 'Create. Play. Call. Complete.';

// Grid sizes 5x5 up to 20x20
export const SUPPORTED_GRID_SIZES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;

export const PLAYER_LIMIT_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export const CALLING_MODES: {
  value: CallingMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'turn-based',
    label: 'Turn-Based',
    description:
      'Players take turns calling an unused number. The turn rotates through the room’s player order.',
  },
  {
    value: 'random',
    label: 'Random',
    description:
      'The server automatically chooses and broadcasts an unused number randomly at timed intervals.',
  },
];

// Helpful word inspirations by grid length
export const WORD_SUGGESTIONS_BY_SIZE: Record<number, string[]> = {
  5: ['BINGO', 'ARENA', 'CHAMP', 'LUCKY', 'TITAN'],
  6: ['ARCADE', 'VICTOR', 'MASTER', 'LEGEND', 'STRIKE'],
  7: ['KRISHNA', 'WARRIOR', 'SUPREME', 'CONQUER', 'PHOENIX'],
  8: ['CHAMPION', 'TRIUMPHS', 'VALIANT', 'ULTIMATE', 'INFINITY'],
  9: ['GLADIATOR', 'VICTORIOUS', 'LIGHTNING', 'DOMINATOR', 'CHAMPIONS'],
  10: ['INVINCIBLE', 'MASTERMIND', 'CENTURIONS', 'LEADERSHIP', 'LEGENDARYS'],
  11: ['BLOCKBUSTER', 'THUNDERBOLT', 'CHAMPIONSHIP', 'UNSTOPPABLE'],
  12: ['GRANDMASTERS', 'UNCONQUERABLE', 'SUPERIORITY'],
  13: ['UNQUESTIONABLE', 'EXTRAORDINARY'],
  14: ['INDOMITABILITY', 'INCOMPREHENSIBL'],
  15: ['UNCONQUERABLENES', 'CHARACTERIZATION'],
  16: ['INCONSEQUENTIALITY'],
  17: ['ELECTROENCEPHALOGRAPHY'],
  18: ['ELECTROCARDIOGRAMS'],
  19: ['UNCHARACTERISTICALLY'],
  20: ['ELECTROENCEPHALOGRAMS'],
};

function resolveApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    if (isLocal) {
      return import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:5001';
    }
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.startsWith('https://')) {
      return envUrl.replace(/\/+$/, '');
    }
    return 'https://bingo-arena-92ne.onrender.com';
  }

  const raw =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'https://bingo-arena-92ne.onrender.com';
  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiUrl();

