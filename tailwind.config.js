/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // This is the new part
      fontFamily: {
        // This tells Tailwind that 'font-sans' should
        // use our CSS variable '--font-inter' first.
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};