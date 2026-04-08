import tseslint from 'typescript-eslint';

import { baseConfig } from './packages/tooling-eslint/index.mjs';

export default tseslint.config(...baseConfig, {
  files: ['**/*.{ts,tsx}'],
  extends: [...tseslint.configs.recommended],
});