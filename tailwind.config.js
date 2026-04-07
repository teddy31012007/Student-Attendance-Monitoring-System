/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#7C3AED',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-up': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'pulse-slow': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        'count-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease both',
        'fade-in-up': 'fade-in-up 0.5s ease both',
        'scale-in': 'scale-in 0.35s ease both',
        'slide-in-right': 'slide-in-right 0.4s ease both',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'count-up': 'count-up 0.5s ease both',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
