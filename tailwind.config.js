/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans SC',
          'ui-sans-serif',
          'system-ui',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
