/**
 * Centralized Design Token System for Bingo Arena
 *
 * Rules:
 * - Base theme: Deep charcoal / near black
 * - Primary: Deep Purple
 * - Secondary: Magenta / Fuchsia
 * - Accent: Gold
 * - Secondary Accent: Warm Orange / Amber
 * - Text: Warm White / Soft White
 * - Muted: Soft Gray / Purple-gray
 * - Avoid excessive neon; use accent colors intentionally for interactive states.
 */

export const THEME_TOKENS = {
  colors: {
    // Backgrounds & Base
    background: '#0B0B10',
    backgroundAlt: '#0E0D14',
    surface: '#13111C',
    surfaceHover: '#1C1929',
    elevated: '#1A1726',
    elevatedHover: '#242036',
    border: '#2A243D',
    borderSubtle: '#1F1B2E',
    borderAccent: '#4C3A6E',

    // Primary (Deep Purple)
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryLight: '#9333EA',
    primaryDark: '#5B21B6',
    primaryMuted: 'rgba(124, 58, 237, 0.15)',

    // Secondary (Magenta / Fuchsia)
    secondary: '#D946EF',
    secondaryHover: '#C026D3',
    secondaryLight: '#EC4899',
    secondaryDark: '#A21CAF',
    secondaryMuted: 'rgba(217, 70, 239, 0.15)',

    // Accent (Gold)
    accent: '#F59E0B',
    accentHover: '#D97706',
    accentLight: '#FBBF24',
    accentDark: '#B45309',
    accentMuted: 'rgba(245, 158, 11, 0.15)',

    // Secondary Accent (Warm Orange / Amber)
    warmOrange: '#F97316',
    warmOrangeHover: '#EA580C',
    warmOrangeLight: '#FB923C',

    // Functional State Colors
    success: '#10B981',
    successMuted: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerHover: '#DC2626',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',

    // Typography
    textPrimary: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',

    // Bingo Letter Signatures
    letters: {
      B: '#7C3AED', // Royal Purple
      I: '#D946EF', // Magenta
      N: '#EC4899', // Neon Fuchsia
      G: '#F59E0B', // Gold
      O: '#F97316', // Warm Orange
    },
  },

  glows: {
    purple: '0 0 20px -3px rgba(124, 58, 237, 0.45)',
    purpleLg: '0 0 35px -5px rgba(124, 58, 237, 0.6)',
    magenta: '0 0 20px -3px rgba(217, 70, 239, 0.45)',
    magentaLg: '0 0 35px -5px rgba(217, 70, 239, 0.6)',
    gold: '0 0 20px -3px rgba(245, 158, 11, 0.45)',
    orange: '0 0 20px -3px rgba(249, 115, 22, 0.45)',
    card: '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(124, 58, 237, 0.2)',
    cardHover: '0 15px 35px -5px rgba(0, 0, 0, 0.9), 0 0 25px -5px rgba(217, 70, 239, 0.3)',
  },

  radius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.5rem',// 24px
    full: '9999px',
  },

  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '3rem', // 48px
  },

  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '450ms',
      ambient: '3500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      outArcade: 'cubic-bezier(0.16, 1, 0.3, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
