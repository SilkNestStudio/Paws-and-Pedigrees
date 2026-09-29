export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override default white with a softer, warmer cream color
        white: '#ffffff',
        earth: {
          50: '#f8f6f2',
          100: '#eeeae4',
          200: '#e0dad1',
          300: '#cbc2b6',
          400: '#a89e91',
          500: '#857b6f',
          600: '#6c645b',
          700: '#514b45',
          800: '#383b42',
          900: '#242f40',
        },
        kennel: {
          50: '#f1f4f9',
          100: '#e2e9f2',
          200: '#c6d3e4',
          300: '#a3b8d2',
          400: '#7c98ba',
          500: '#5d7da6',
          600: '#45638c',
          700: '#324d72',
          800: '#243b5b',
          900: '#19283f',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
