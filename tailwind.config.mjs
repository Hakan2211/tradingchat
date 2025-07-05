/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Point to the CSS variable for the sans-serif font
        sans: ['var(--font-sans)'],
        // Point to the CSS variable for the serif font
        serif: ['var(--font-serif)'],
      },
    },
  },
  plugins: [],
};
