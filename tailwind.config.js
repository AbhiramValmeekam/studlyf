/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The four neutrals resolve through CSS variables (channel triplets) so
        // a single `.light` class on <html> flips the whole app. Opacity
        // modifiers (bg-ink2/70, border-bone/12, …) keep working via <alpha-value>.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        ink2: 'rgb(var(--ink-2) / <alpha-value>)',
        bone: 'rgb(var(--bone) / <alpha-value>)',
        bone2: 'rgb(var(--bone-2) / <alpha-value>)',
        // Accents stay constant across themes.
        acid: '#C7F24E',
        flare: '#FF4A28',
        violet: '#6C4BFF',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
        crush: '-0.06em',
      },
      screens: {
        '3xl': '1800px',
      },
    },
  },
  plugins: [],
}
