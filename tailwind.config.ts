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
          DEFAULT: '#1e3a8a',
          light: '#2563eb',
          dark: '#172e70',
        },
        corporate: {
          DEFAULT: '#1e3a8a',
          dark: '#172e70',
          deeper: '#0f2462',
          border: '#1d4ed8',
          hover: '#2563eb',
        },
        accent: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
          bg: 'rgba(59, 130, 246, 0.12)',
        },
        surface: {
          DEFAULT: '#f0f4f8',
          card: '#ffffff',
        },
      },
      boxShadow: {
        'panel': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 8px 25px -5px rgb(59 130 246 / 0.12), 0 4px 10px -4px rgb(0 0 0 / 0.04)',
        'dropdown': '0 10px 40px -10px rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
