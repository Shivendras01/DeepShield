/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FBFBFA',
          subtle: '#F6F6F3',
          card: '#FFFFFF',
          border: '#E8E7E1',
          'border-subtle': '#F0EFEA',
        },
        ink: {
          DEFAULT: '#191B1D',
          muted: '#666C72',
          faint: '#9EA3A8',
        },
        emerald: {
          bank: '#0E4937',
          hover: '#0A392B',
          soft: '#EAF5F0',
          border: '#CBE5D9',
        },
        sage: {
          DEFAULT: '#0F766E',
          soft: '#F0FDF4',
          border: '#BBF7D0',
        },
        amber: {
          bank: '#B45309',
          soft: '#FFFBEB',
          border: '#FDE68A',
        },
        wine: {
          bank: '#991B1B',
          soft: '#FEF2F2',
          border: '#FECACA',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(24, 25, 27, 0.03), 0 1px 2px -1px rgba(24, 25, 27, 0.03)',
        'soft-md': '0 4px 16px -2px rgba(24, 25, 27, 0.04), 0 2px 6px -2px rgba(24, 25, 27, 0.02)',
        'soft-lg': '0 12px 32px -4px rgba(24, 25, 27, 0.06), 0 4px 12px -2px rgba(24, 25, 27, 0.03)',
        'soft-card': '0 0 0 1px rgba(24, 25, 27, 0.04), 0 2px 8px -2px rgba(24, 25, 27, 0.04)',
      },
    },
  },
  plugins: [],
}
