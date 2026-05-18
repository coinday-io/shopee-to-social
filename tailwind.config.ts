import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          hover: '#E85A28',
          50: '#FFF4EF',
          100: '#FFE2D2',
          500: '#FF6B35',
          600: '#E85A28',
          700: '#C44A1F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1A1A1A',
        },
        border: {
          DEFAULT: '#E5E5E5',
          dark: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
