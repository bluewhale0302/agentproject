/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':      { transform: 'translateX(-6px) rotate(-1deg)' },
          '30%':      { transform: 'translateX(6px)  rotate(1deg)' },
          '45%':      { transform: 'translateX(-5px) rotate(-0.5deg)' },
          '60%':      { transform: 'translateX(5px)  rotate(0.5deg)' },
          '75%':      { transform: 'translateX(-3px)' },
          '90%':      { transform: 'translateX(3px)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
