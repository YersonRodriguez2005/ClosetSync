/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'closet-bg': '#f8fafc', // slate-50
        'closet-primary': '#4f46e5', // indigo-600
        'closet-secondary': '#14b8a6', // teal-500
        'closet-text': '#1e293b', // slate-800
        'closet-subtext': '#64748b', // slate-500
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
  // Importante: desactiva el preflight para evitar conflictos con los estilos globales de Ionic
  corePlugins: {
    preflight: false,
  }
}