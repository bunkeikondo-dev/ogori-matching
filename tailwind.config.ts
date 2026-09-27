import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff7ff',
          100: '#dbeeff',
          200: '#bfe0ff',
          300: '#92cbff',
          400: '#5cadf7',
          500: '#2f8ce0',
          600: '#0f6fc6',
          700: '#0058a8',
          800: '#064a8a',
          900: '#0a3d70',
        },
      },
      fontFamily: {
        sans: [
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Noto Sans JP"',
          '"Yu Gothic"',
          'Meiryo',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 4px 24px -6px rgba(0, 88, 168, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
