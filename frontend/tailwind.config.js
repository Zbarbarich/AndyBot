const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22d4cc',
          light: '#6aefe6',
          dark: '#16b5ad',
          hover: '#16b5ad',
        },
        secondary: {
          DEFAULT: '#8b58c3',
          light: '#af87e1',
        },
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        /* Legacy aliases — map to CSS variables for gradual migration */
        'dark-bg': 'var(--color-bg)',
        'dark-surface': 'var(--color-surface)',
        'dark-surface-elevated': 'var(--color-surface-elevated)',
        'dark-text': 'var(--color-text)',
        'dark-text-muted': 'var(--color-text-muted)',
        'dark-border': 'var(--color-border)',
        'primary-hover': '#16b5ad',
        accent: '#6aefe6',
        'accent-hover': '#2ee0d6',
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
        display: ['Space Grotesk', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
