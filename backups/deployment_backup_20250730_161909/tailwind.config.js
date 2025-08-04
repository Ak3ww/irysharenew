/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'Irys': ['Irys', 'sans-serif'],
        'Irys2': ['Irys2', 'sans-serif'],
        'IrysItalic': ['IrysItalic', 'sans-serif'],
      },
      colors: {
        'blue-card': '#1D8FFF',
        'yellow-card': '#FFD426',
        'icon-blue': '#0080FF',
        'icon-purple': '#B22CFF',
        'icon-green': '#00A67E',
        'icon-yellow': '#FFB800',
        'icon-pink': '#FF3EA5',
      },
    },
  },
  plugins: [],
}