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
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        'card-hover': '0 4px 10px -4px rgb(15 23 42 / 0.12)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
