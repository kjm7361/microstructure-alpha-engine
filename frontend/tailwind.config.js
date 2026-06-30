/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg:     '#0a0e14',
          panel:  '#0d1117',
          border: '#1c2333',
          green:  '#00ff88',
          cyan:   '#00d4ff',
          red:    '#ff4d4d',
          yellow: '#ffd700',
          orange: '#ff8c00',
          dim:    '#30363d',
          text:   '#c9d1d9',
          muted:  '#6b7280',
          bright: '#e6edf3',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', '"Courier New"', 'monospace'],
      },
      animation: {
        'flash-green': 'flash-green 0.3s ease-out',
        'flash-red':   'flash-red 0.3s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'flash-green': {
          '0%':   { backgroundColor: 'rgba(0,255,136,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-red': {
          '0%':   { backgroundColor: 'rgba(255,77,77,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
