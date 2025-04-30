/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#ADE4DB',         
        secondary: '#E7E8F2',       
        cardBlue: '#59A5F7',       
        cardGreen: '#5AD6A4',      
        cardPurple: '#A979F8',     
        cardCyan: '#4BC1F1',        
        textDark: '#333',
      }
    }
  },
  plugins: [],
};


