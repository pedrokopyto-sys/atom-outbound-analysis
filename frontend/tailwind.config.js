/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      colors: {
        accent: '#f97316',
        'accent-dark': '#ea580c',
        'accent-light': '#fb923c',
        cream: '#fdf7f0'
      }
    }
  },
  plugins: []
}
