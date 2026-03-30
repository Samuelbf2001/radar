/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:  '#0a2342',
        blue:  '#1d70a2',
        teal:  '#00bfa5',
        gray:  '#e0e0e0',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        lato:    ['Lato', 'sans-serif'],
        dm:      ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
