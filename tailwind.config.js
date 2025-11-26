export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f9f7f4',
          100: '#f1ebe3',
          200: '#e3d7c7',
          300: '#d4c3ab',
          400: '#c6af8f',
          500: '#b89b73',
          600: '#a88657',
          700: '#8a6d47',
          800: '#6b5438',
          900: '#4d3c29',
        },
        kennel: {
          50: '#faf8f5',
          100: '#f5f1ea',
          200: '#e8e0d5',
          300: '#dbd0c0',
          400: '#cebfab',
          500: '#c1af96',
          600: '#a89577',
          700: '#897759',
          800: '#6a593b',
          900: '#4b3b1d',
        }
      }
    },
  },
  plugins: [],
}
