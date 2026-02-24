/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#08080e',
        surface: '#111118',
        surface2: '#1a1a24',
        border: '#2a2a38',
        accent: '#c8ff00',
        accent2: '#7b5ea7',
        muted: '#6b6b82',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(200,255,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(200,255,0,0)' },
        },
      },
    },
  },
  plugins: [],
}
