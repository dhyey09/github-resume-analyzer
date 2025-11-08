/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'font-sans' should use CSS variable '--font-inter' first.
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};