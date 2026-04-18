import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1A1033',
        paper: '#EDE6FF',
        moss: '#5B3DF5',
        clay: '#FF7AB6',
        muted: '#4E4669',
        lime: '#C6F24B',
        peach: '#FFB78A',
      },
      fontFamily: {
        display: ["'Fraunces'", 'Georgia', 'serif'],
        body: ["'Manrope'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    }
  },
  plugins: []
} satisfies Config;
