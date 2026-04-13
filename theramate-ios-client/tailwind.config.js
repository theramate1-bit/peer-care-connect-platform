const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Must be absolute: when Metro runs from the monorepo root, relative `./app` resolves to the wrong folder.
  content: [
    path.join(__dirname, "app/**/*.{js,jsx,ts,tsx}"),
    path.join(__dirname, "components/**/*.{js,jsx,ts,tsx}"),
    path.join(__dirname, "lib/**/*.{js,jsx,ts,tsx}"),
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary - Soft Cream Theme
        cream: {
          50: '#FFFDF8',   // Background
          100: '#FFF9EB',  // Card backgrounds
          200: '#FFF3D6',  // Subtle highlights
          300: '#FFE9B8',  // Borders
          400: '#FFD98C',  // Interactive states
        },
        // Accent - Sage Green
        sage: {
          400: '#9BC19F',
          500: '#7A9E7E',  // Primary action
          600: '#5C7F61',  // Pressed states
          700: '#446349',
        },
        // Accent - Terracotta
        terracotta: {
          400: '#D9A08E',
          500: '#C9826D',  // Secondary accent
          600: '#A66B59',  // Pressed states
          700: '#845548',
        },
        // Neutrals - Charcoal
        charcoal: {
          50: '#F5F3F0',
          100: '#E8E4DF',  // Dividers
          200: '#D4CFC8',
          300: '#A09A94',  // Placeholders
          400: '#8A847E',
          500: '#6B6660',  // Tertiary text
          600: '#5A5550',
          700: '#4A4641',  // Secondary text
          800: '#3A3733',
          900: '#2D2A26',  // Primary text
        },
        // Semantic Colors
        success: '#6B9B6B',
        warning: '#E8A952',
        error: '#C75D5D',
        info: '#6B8FAD',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['32px', { lineHeight: '40px' }],
        '4xl': ['40px', { lineHeight: '48px' }],
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(45, 42, 38, 0.08)',
        'medium': '0 4px 16px rgba(45, 42, 38, 0.12)',
        'strong': '0 8px 32px rgba(45, 42, 38, 0.16)',
      },
    },
  },
  plugins: [],
};

