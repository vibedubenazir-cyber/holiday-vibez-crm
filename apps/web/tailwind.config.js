/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#005aaa',
          dark: '#00447f',
          light: '#e6f1fb',
        },
      },
    },
  },
  plugins: [],
};
