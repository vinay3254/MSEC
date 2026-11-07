/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4E2478',
          dark: '#38195A',
          light: '#EDE4F5',
        },
        accent: {
          DEFAULT: '#F30137',
          dark: '#C4012C',
          light: '#FDE2E7',
        },
        ink: {
          DEFAULT: '#1A1523',
          muted: '#5C5468',
        },
        border: {
          DEFAULT: '#E3DEE9',
        },
        surface: '#FFFFFF',
        bg: '#FAF8FC',
        success: '#1C8A5C',
        warning: '#D98B16',
        danger: '#D6264C',
        info: '#2563A6',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
