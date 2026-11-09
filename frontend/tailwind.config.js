/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: '#172C3B', 700: '#22405A', 50: '#EEF1F3' },
        ivory: { DEFAULT: '#F7F5EF', deep: '#EFECE3' },
        sage: { DEFAULT: '#557C70', 50: '#EAF0ED', 100: '#D5E1DC' },
        champagne: { DEFAULT: '#D6B77A', 50: '#F8F1E2' },
        charcoal: { DEFAULT: '#303A43', 60: '#66707A' },
        line: '#E7E5DE',
        amber: { DEFAULT: '#C18A3B', 50: '#F7EEDD' },
        terracotta: { DEFAULT: '#B65C55', 50: '#F6E7E5' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      borderRadius: { sm: '3px', DEFAULT: '5px', md: '6px', lg: '8px' },
      boxShadow: {
        card: '0 1px 2px rgba(23,44,59,0.04), 0 1px 1px rgba(23,44,59,0.03)',
        pop: '0 12px 32px -8px rgba(23,44,59,0.18), 0 2px 6px rgba(23,44,59,0.06)',
      },
      keyframes: {
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.98)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'overlay-in': 'overlay-in 150ms ease-out',
        'dialog-in': 'dialog-in 180ms ease-out',
        'fade-up': 'fade-up 280ms ease-out both',
      },
    },
  },
  plugins: [],
};
