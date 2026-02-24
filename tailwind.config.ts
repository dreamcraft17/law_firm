import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0c1929',
          light: '#132337',
        },
        navy: {
          DEFAULT: '#0c1929',
          light: '#132337',
          border: '#1e3a5f',
        },
        gold: {
          DEFAULT: '#c9a227',
          light: '#e6c04a',
          dark: '#a68520',
          bg: 'rgba(201, 162, 39, 0.12)',
        },
        surface: {
          DEFAULT: '#f1f5f9',
          card: '#ffffff',
        },
      },
      boxShadow: {
        'panel': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 8px 25px -5px rgb(0 0 0 / 0.08), 0 4px 10px -4px rgb(0 0 0 / 0.04)',
        'dropdown': '0 10px 40px -10px rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
