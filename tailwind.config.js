/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        laboratory: {
          950: '#0a0c10',
          900: '#0f1218',
          850: '#12151c',
          800: '#161a22',
          750: '#1a1f29',
          700: '#1e2330',
          600: '#2a3245',
          500: '#3c4760',
          400: '#64748b',
          300: '#94a3b8',
          200: '#cbd5e1',
          100: '#f1f5f9',
        },
        prism: {
          cyan: '#00e5ff',
          blue: '#3b82f6',
          cobalt: '#1d4ed8',
          ruby: '#ff1744',
          crimson: '#ef4444',
          scarlet: '#b91c1c',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      },
      boxShadow: {
        'prism-blue': '0 0 20px -3px rgba(0, 229, 255, 0.4), 0 0 8px rgba(59, 130, 246, 0.6)',
        'prism-red': '0 0 20px -3px rgba(255, 23, 68, 0.4), 0 0 8px rgba(239, 68, 68, 0.6)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
