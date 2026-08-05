/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#dcedff',
          200: '#b3d9ff',
          300: '#7ebeff',
          400: '#3f9bff',
          500: '#0f78f0',
          600: '#005aaa',
          700: '#00447f',
          DEFAULT: '#005aaa',
          dark: '#00447f',
          light: '#e6f1fb',
        },
        accent: {
          DEFAULT: '#fb923c',
          dark: '#ea580c',
          light: '#fff2e6',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(0 90 170 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
