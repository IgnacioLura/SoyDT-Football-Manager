// soydt/web/tailwind.config.js
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          tertiary: 'var(--accent-tertiary)',
        },
        tier: {
          bronze: 'var(--tier-bronze)',
          silver: 'var(--tier-silver)',
          gold: 'var(--tier-gold)',
          elite: 'var(--tier-elite)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      transitionTimingFunction: {
        momentum: 'var(--ease-momentum)',
        trajectory: 'var(--ease-trajectory)',
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
        snap: 'var(--transition-snap)',
      },
      keyframes: {
        'rb-elite-pulse': {
          '0%, 100%': { boxShadow: 'var(--shadow-card), 0 0 0 0 rgba(var(--accent-primary-rgb), 0.45)' },
          '50%': { boxShadow: 'var(--shadow-card), 0 0 14px 2px rgba(var(--accent-primary-rgb), 0.4)' },
        },
        'pc-card-shine': {
          to: { transform: 'translateX(120%)' },
        },
        'pc-badge-in-left': {
          from: { transform: 'translateX(-14px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'pc-badge-in-right': {
          from: { transform: 'translateX(14px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'nr-tri-in': {
          from: { transform: 'translate(-10px, -50%)', opacity: '0' },
          to: { transform: 'translate(-2px, -50%)', opacity: '1' },
        },
        'nr-active-glow': {
          '0%, 100%': { boxShadow: 'none' },
          '50%': { boxShadow: '0 0 12px rgba(var(--accent-primary-rgb), 0.3)' },
        },
      },
      animation: {
        'rb-elite-pulse': 'rb-elite-pulse 2.2s ease-in-out infinite',
        'pc-card-shine': 'pc-card-shine 0.85s ease forwards',
        'pc-badge-in-left': 'pc-badge-in-left var(--transition-base) var(--ease-trajectory) both',
        'pc-badge-in-right': 'pc-badge-in-right var(--transition-base) var(--ease-trajectory) both',
        'nr-tri-in': 'nr-tri-in var(--transition-fast) var(--ease-trajectory) both',
        'nr-active-glow': 'nr-active-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
