import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Surface / Background layers */
        surface: {
          DEFAULT: '#131313',
          dim: '#0e0e0e',
          low: '#1c1b1b',
          container: '#201f1f',
          high: '#2a2a2a',
          highest: '#353534',
          bright: '#3a3939',
        },

        /* Primary accent (coral) */
        primary: {
          DEFAULT: '#ffb4a8',
          container: '#5E0101',
          fixed: '#ffdad5',
          'fixed-dim': '#ffb4a8',
        },
        'on-primary': {
          DEFAULT: '#660704',
          container: '#eb6a59',
          fixed: '#410000',
          'fixed-variant': '#862117',
        },

        /* Secondary */
        secondary: {
          DEFAULT: '#ffb4a8',
          container: '#753229',
          fixed: '#ffdad4',
          'fixed-dim': '#ffb4a8',
        },
        'on-secondary': {
          DEFAULT: '#581d15',
          container: '#f99d8f',
          fixed: '#3c0804',
          'fixed-variant': '#753229',
        },

        /* Tertiary (cream/gold) */
        tertiary: {
          DEFAULT: '#cdc990',
          container: '#b1ad76',
          fixed: '#eae5aa',
          'fixed-dim': '#cdc990',
        },
        'on-tertiary': {
          DEFAULT: '#343207',
          container: '#434115',
          fixed: '#1e1c00',
          'fixed-variant': '#4b481c',
        },

        /* On-surface text */
        'on-surface': {
          DEFAULT: '#e5e2e1',
          variant: '#dec0bb',
        },

        /* Outline / borders */
        outline: {
          DEFAULT: '#a68a86',
          variant: '#57423e',
        },

        /* Error */
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'on-error': {
          DEFAULT: '#690005',
          container: '#ffdad6',
        },

        /* Inverse (for contrast panels) */
        'inverse-surface': '#e5e2e1',
        'inverse-on-surface': '#313030',
        'inverse-primary': '#a7382c',

        /* Surface tint */
        'surface-tint': '#ffb4a8',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'ambient': '0 8px 32px rgba(94, 1, 1, 0.04)',
        'ambient-lg': '0 20px 40px rgba(94, 1, 1, 0.08)',
        'glow': '0 0 24px rgba(255, 180, 168, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
