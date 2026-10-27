/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        blush: {
          50: '#fff5f7',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        rosebrand: {
          DEFAULT: '#e11d48',
          light: '#f43f5e',
          dark: '#be123c',
          tint: '#fff5f7',
        },
        surface: {
          bg: '#fff5f7',
          card: '#ffffff',
          border: '#ffe4e6',
          subtle: '#fdf2f4',
        },
        darkbg: '#080c14',
        darkcard: '#0f172a',
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(225, 29, 72, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 28px -4px rgba(225, 29, 72, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'glow-rose': '0 0 25px -4px rgba(225, 29, 72, 0.35)',
        'glow-sm': '0 0 15px -3px rgba(225, 29, 72, 0.25)',
      }
    },
  },
  plugins: [],
}
