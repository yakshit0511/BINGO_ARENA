/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: '#0B0B10',
          'bg-alt': '#0E0D14',
          surface: '#13111C',
          'surface-hover': '#1C1929',
          elevated: '#1A1726',
          'elevated-hover': '#242036',
          border: '#2A243D',
          'border-subtle': '#1F1B2E',
          'border-accent': '#4C3A6E',
          card: '#13111C',
          purple: '#7C3AED',
          'purple-hover': '#6D28D9',
          'purple-light': '#9333EA',
          'purple-dark': '#5B21B6',
          magenta: '#D946EF',
          'magenta-hover': '#C026D3',
          'magenta-light': '#EC4899',
          gold: '#F59E0B',
          'gold-hover': '#D97706',
          'gold-light': '#FBBF24',
          orange: '#F97316',
          'orange-hover': '#EA580C',
          success: '#10B981',
          danger: '#EF4444',
          'danger-hover': '#DC2626',
          text: '#F8FAFC',
          'text-secondary': '#E2E8F0',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
      },
      fontFamily: {
        arcade: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'neon-purple': '0 0 20px -3px rgba(124, 58, 237, 0.45)',
        'neon-purple-lg': '0 0 35px -5px rgba(124, 58, 237, 0.6)',
        'neon-magenta': '0 0 20px -3px rgba(217, 70, 239, 0.45)',
        'neon-magenta-lg': '0 0 35px -5px rgba(217, 70, 239, 0.6)',
        'neon-gold': '0 0 20px -3px rgba(245, 158, 11, 0.45)',
        'neon-orange': '0 0 20px -3px rgba(249, 115, 22, 0.45)',
        'arcade-card': '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(124, 58, 237, 0.2)',
        'arcade-card-hover': '0 15px 35px -5px rgba(0, 0, 0, 0.9), 0 0 25px -5px rgba(217, 70, 239, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
