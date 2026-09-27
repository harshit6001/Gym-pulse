/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          dark: '#0B0F17',
          card: '#141C2B',
          cardHover: '#1E293B',
          border: '#334155',
          accent: '#10B981', // Emerald green
          accentHover: '#059669',
          amber: '#F59E0B',
          rose: '#EF4444',
          cyan: '#06B6D4',
          purple: '#8B5CF6'
        }
      }
    },
  },
  plugins: [],
}
