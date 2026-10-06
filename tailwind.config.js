/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals resolve through CSS variables (channel triplets) so opacity
        // modifiers (bg-ink2/70, border-line/10, text-mute/80) keep working.
        ink: 'rgb(var(--ink) / <alpha-value>)',
        ink2: 'rgb(var(--ink-2) / <alpha-value>)',
        ink3: 'rgb(var(--ink-3) / <alpha-value>)',
        bone: 'rgb(var(--bone) / <alpha-value>)',
        mute: 'rgb(var(--bone-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        // Accents — constant across contexts.
        acid: '#4CC9FF',
        violet: '#5B2CFF',
        flare: '#FF4D2E',
      },
      fontFamily: {
        display: ['"Clash Display"', 'Impact', 'sans-serif'],
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'ui-serif', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Fluid editorial display scale.
        display: ['clamp(3.2rem, 11vw, 12rem)', { lineHeight: '0.88', letterSpacing: '-0.045em' }],
        mega: ['clamp(2.6rem, 7vw, 6.5rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
        huge: ['clamp(2rem, 4.5vw, 4rem)', { lineHeight: '0.98', letterSpacing: '-0.03em' }],
        lede: ['clamp(1.1rem, 1.6vw, 1.6rem)', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
      },
      letterSpacing: {
        crush: '-0.055em',
        tightest: '-0.045em',
      },
      maxWidth: {
        edge: '1600px',
        prose2: '68ch',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
        swift: 'cubic-bezier(0.4, 0, 0.1, 1)',
      },
      screens: {
        '3xl': '1800px',
      },
    },
  },
  plugins: [],
}
