/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        asphalt: 'var(--asphalt)',
        concrete: 'var(--concrete)',
        fog: 'var(--fog)',
        bone: 'var(--bone)',
        smoke: 'var(--smoke)',
        signal: 'var(--signal)',
        blood: 'var(--blood)',
        rust: 'var(--rust)',
      },
      fontFamily: {
        display: [
          "'Dusk Till Dawn'",
          "'Big Shoulders Stencil'",
          "'Grenze Gotisch'",
          'Oswald',
          'sans-serif',
        ],
        sans: ['Oswald', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '1px',
        DEFAULT: '1px',
        md: '2px',
        lg: '2px',
      },
    },
  },
  corePlugins: {
    boxShadow: false,
  },
  plugins: [],
};
