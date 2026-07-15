/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      xs: '475px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        midnight: '#0F1F2E',
        deep: '#081522',
        ink: '#0C1A25',
        /* Blue accent (kept the "gold" class name so existing markup keeps working) */
        gold: '#93B4CE',
        'gold-soft': '#B6CDDE',
        /* Cool whites — no warm undertone */
        paper: '#F5F8FB',
        linen: '#E8EEF4',
        sand: '#D8E1E9',
        stone: '#8697A5',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'fluid-eyebrow': ['clamp(0.65rem, 0.62rem + 0.1vw, 0.72rem)', { lineHeight: '1.3' }],
        'fluid-body':    ['clamp(0.9rem, 0.88rem + 0.15vw, 1rem)',    { lineHeight: '1.6' }],
        'fluid-lead':    ['clamp(0.95rem, 0.9rem + 0.3vw, 1.1rem)',   { lineHeight: '1.55' }],
        'fluid-h3':      ['clamp(1.1rem, 0.95rem + 0.7vw, 1.5rem)',   { lineHeight: '1.2' }],
        'fluid-h2':      ['clamp(1.5rem, 1.15rem + 1.6vw, 2.5rem)',   { lineHeight: '1.1' }],
        'fluid-h1':      ['clamp(1.95rem, 1.5rem + 2.4vw, 3.5rem)',   { lineHeight: '1.08' }],
        'fluid-display': ['clamp(2.25rem, 1.7rem + 3vw, 4.5rem)',     { lineHeight: '1.05' }],
        'fluid-stat':    ['clamp(1.5rem, 1.15rem + 1.4vw, 2.25rem)',  { lineHeight: '1' }],
      },
      letterSpacing: {
        display: '-0.02em',
        tight2: '-0.015em',
        tight3: '-0.01em',
        eyebrow: '0.22em',
        eyebrow2: '0.18em',
      },
      lineHeight: {
        display: '1.02',
      },
      maxWidth: {
        prose: '58ch',
      },
      transitionTimingFunction: {
        'silk': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'gentle': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        250: '250ms',
        450: '450ms',
        700: '700ms',
        1000: '1000ms',
      },
    },
  },
  plugins: [],
};
