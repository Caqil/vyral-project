/** @type {import('tailwindcss').Config} */
const baseConfig = require('@vyral/ui/tailwind.config');

module.exports = {
  ...baseConfig,
  content: [
    // Web app content
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    // UI package content  
    "./node_modules/@vyral/ui/src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@vyral/ui/dist/**/*.{js,mjs}",
    // Include other workspace packages if needed
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  // Ensure we include all the base config
  theme: baseConfig.theme,
  plugins: baseConfig.plugins,
};