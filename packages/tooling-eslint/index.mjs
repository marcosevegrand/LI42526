export const baseConfig = [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.turbo/**',
      'assets/**',
      'supabase/.temp/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default baseConfig;