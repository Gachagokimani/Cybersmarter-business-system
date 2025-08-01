module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      colors: {
        'burgundy': {
          'light': '#fdf2f2',
          'medium': '#8b2635',
          'dark': '#5d1a24',
          'darker': '#3f1418',
        },
        'sea-blue': {
          'light': '#e6f3ff',
          'medium': '#4a90e2',
          'dark': '#2c5aa0',
          'darker': '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
} 