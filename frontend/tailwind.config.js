const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Accent colors - teal/green/blue
        primary: '#14b8a6', // teal-500
        'primary-hover': '#0d9488', // teal-600
        'primary-light': '#5eead4', // teal-300
        accent: '#06b6d4', // cyan-500
        'accent-hover': '#0891b2', // cyan-600
        
        // Dark theme - grey/navy/slate
        'dark-bg': '#0f172a', // slate-900
        'dark-surface': '#1e293b', // slate-800
        'dark-surface-elevated': '#334155', // slate-700
        'dark-text': '#f1f5f9', // slate-100
        'dark-text-muted': '#cbd5e1', // slate-300
        'dark-border': '#334155', // slate-700
        
        // Light theme
        'light-bg': '#ffffff',
        'light-surface': '#f8fafc', // slate-50
        'light-surface-elevated': '#f1f5f9', // slate-100
        'light-text': '#0f172a', // slate-900
        'light-text-muted': '#475569', // slate-600
        'light-border': '#e2e8f0', // slate-200
      },
      spacing: {
        xs: 'clamp(0.25rem, 0.5vw, 0.5rem)',
        sm: 'clamp(0.5rem, 1vw, 0.75rem)',
        md: 'clamp(1rem, 2vw, 1.5rem)',
        lg: 'clamp(1.5rem, 3vw, 2rem)',
        xl: 'clamp(2rem, 4vw, 3rem)',
      },
      fontSize: {
        sm: 'clamp(0.75rem, 1.5vw, 0.875rem)',
        base: 'clamp(0.875rem, 1.75vw, 1rem)',
        lg: 'clamp(1rem, 2vw, 1.125rem)',
        xl: 'clamp(1.125rem, 2.25vw, 1.25rem)',
        '2xl': 'clamp(1.25rem, 2.5vw, 1.5rem)',
      },
      maxWidth: {
        container: 'min(1280px, 95vw)',
        'container-xl': 'min(1536px, 92vw)',
        modal: 'min(400px, 95vw)',
        'review-modal': 'min(900px, 95vw)',
        form: 'min(600px, 95vw)',
      },
      screens: {
        ...defaultTheme.screens,
        xl: '1280px',
        '2xl': '1536px',
      },
      borderRadius: {
        DEFAULT: 'clamp(4px, 1vw, 8px)',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
