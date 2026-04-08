import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4efe8',
        ink: '#1b1b1b',
        accent: '#c35b2d',
        steel: '#45556c',
      },
    },
  },
  plugins: [],
};

export default config;
