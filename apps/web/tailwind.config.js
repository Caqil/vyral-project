/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Include UI package components
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Extend the UI package's theme
  presets: [require('../../packages/ui/tailwind.config.js')],
  theme: {
    extend: {
    },
  },
  plugins: [],
}
