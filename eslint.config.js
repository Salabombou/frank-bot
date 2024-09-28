import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { ignores: ['node_modules', 'build'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier
];
