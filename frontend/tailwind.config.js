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
          DEFAULT: '#F8FAFC',
          subtle: '#F1F5F9',
          card: '#FFFFFF',
          border: '#E2E8F0',
          'border-subtle': '#EEF2F6',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          faint: '#94A3B8',
        },
        emerald: {
          bank: '#064E3B',
          hover: '#022C22',
          soft: '#ECFDF5',
          border: '#A7F3D0',
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
