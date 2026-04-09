/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f13',
        surface: '#1a1a24',
        surface2: '#242436',
        border: '#2e2e44',
        primary: {
          DEFAULT: '#7c5cfc',
          hover: '#6b4ae8',
          glow: 'rgba(124, 92, 252, 0.25)',
        },
        accent: {
          DEFAULT: '#40e0d0',
        },
        danger: {
          DEFAULT: '#ff4d6a',
        },
        text: {
          DEFAULT: '#e8e6f0',
          muted: '#8888a8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.25s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px #40e0d0' },
          '50%': { boxShadow: '0 0 20px #40e0d0' },
        },
      },
    },
  },
  plugins: [],
};
