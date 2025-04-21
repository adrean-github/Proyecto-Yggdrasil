/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#ADE4DB',         // Verde agua para header
        secondary: '#E7E8F2',       // Fondo suave
        cardBlue: '#59A5F7',        // Cards de médicos
        cardGreen: '#5AD6A4',       // Cards de ocupados
        cardPurple: '#A979F8',      // Cards otros
        cardCyan: '#4BC1F1',        // Cards disponibles
        textDark: '#333',
      }
    }
  },
  plugins: [],
};
