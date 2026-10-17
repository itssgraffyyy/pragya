/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        console: {
          bg: '#0b0f14',
          panel: '#121821',
          border: '#263140',
          accent: '#4da3ff',
          warn: '#ffb454',
          danger: '#ff6b6b',
          ok: '#5ad39a',
          text: '#d7e0ea',
          muted: '#8a97a7',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['Consolas', 'Menlo', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
