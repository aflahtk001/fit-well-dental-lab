/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dental: {
          DEFAULT: '#20596E',
          hover: '#286e88',
          active: '#184656',
          light: '#20596E1a',
        },
      },
    },
  },
  plugins: [],
}
