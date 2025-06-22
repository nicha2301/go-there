/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3366FF',
        secondary: '#5E81F4',
        background: '#F7F9FC',
        card: '#FFFFFF',
        text: '#222B45',
        textSecondary: '#8F9BB3',
        border: '#EDF1F7',
        placeholder: '#C5CEE0',
        grey: '#8F9BB3',
        lightGrey: '#E4E9F2',
        error: '#FF3D71',
        errorLight: '#FFE8EF',
        success: '#00E096',
        warning: '#FFAA00',
      },
      borderRadius: {
        'small': '4px',
        'medium': '8px',
        'large': '16px',
        'circle': '50%',
      }
    },
  },
  plugins: [],
}

