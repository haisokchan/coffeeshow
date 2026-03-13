/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL: Enable dark mode with 'class' strategy
  darkMode: 'class',
  
  content: [
    "./src/**/*.{html,ts}",
  ],
  
  theme: {
    extend: {
      colors: {
        // You can add custom colors here if needed
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  
  plugins: [],
}