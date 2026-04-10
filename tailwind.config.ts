import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18201b',
        paper: '#f7f0df',
        moss: '#526b4f',
        clay: '#b75f35'
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['ui-serif', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
} satisfies Config;