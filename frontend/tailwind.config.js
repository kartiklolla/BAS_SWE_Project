/** @type {import('tailwindcss').Config} */
// Storybook palette taken from the reference illustration. Text pairings were picked to
// clear WCAG AA (4.5:1) on the cream background: ink-muted 6.7:1, lagoon-700 5.6:1,
// fern-800 / coral-800 / mustard-800 on their own -100 tints >= 6:1.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FFFDF6', 100: '#FBF7EA', 200: '#F4EEDB', 300: '#E7DEC3' },
        ink: { DEFAULT: '#211D17', soft: '#4A4438', muted: '#5E5747' },
        lagoon: { 100: '#E3F4F9', 200: '#BFE6F2', 400: '#6CC4DF', 600: '#2E86A8', 700: '#1F6A87' },
        fern: { 100: '#D7F0EA', 500: '#1F9E89', 700: '#16705F', 800: '#0F5446' },
        coral: { 100: '#FDE2E0', 400: '#EF6F6C', 800: '#8E2B2B' },
        mustard: { 100: '#FDF0CC', 400: '#F4B740', 800: '#7A5410' },
        tangerine: '#F39243',
        navy: '#26324D',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      boxShadow: {
        soft: '0 1px 0 rgba(33,29,23,.04), 0 12px 30px -16px rgba(33,29,23,.28)',
        lift: '0 2px 0 rgba(33,29,23,.05), 0 22px 40px -18px rgba(33,29,23,.35)',
      },
    },
  },
  plugins: [],
};
