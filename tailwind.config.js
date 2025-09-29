/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens – use in components rather than raw hex values
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          ring: 'var(--color-brand-ring)',
        },
        surface: {
          0: 'var(--color-surface-0)', // base near-black
          1: 'var(--color-surface-1)', // raised panels
          2: 'var(--color-surface-2)', // overlays / modals
          3: 'var(--color-surface-3)',
          border: 'var(--color-surface-border)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverted: 'var(--color-text-inverted)',
        },
        focus: {
          ring: 'var(--color-focus-ring)',
        },
        danger: {
          DEFAULT: '#dc2626'
        },
      },
      boxShadow: {
        'focus-brand': '0 0 0 3px var(--color-focus-ring)',
        'brand-glow': '0 0 0 1px var(--color-brand), 0 0 12px -2px var(--color-brand)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      fontSize: {
        // Ten-foot UI ramps (slightly larger)
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'base': ['1rem', { lineHeight: '1.4rem' }],
        'lg': ['1.125rem', { lineHeight: '1.5rem' }],
        'xl': ['1.35rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.65rem', { lineHeight: '2rem' }],
        '3xl': ['2.1rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.7rem' }],
        '5xl': ['3.25rem', { lineHeight: '1' }],
        '6xl': ['4rem', { lineHeight: '1' }],
        '7xl': ['4.75rem', { lineHeight: '1' }],
        '8xl': ['6.25rem', { lineHeight: '1' }],
        '9xl': ['8.25rem', { lineHeight: '1' }],
      },
      aspectRatio: {
        'poster': '2/3',
        'backdrop': '16/9',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};