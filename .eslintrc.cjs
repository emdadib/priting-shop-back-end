/* eslint-env node */
// ESLint config for the Express + Prisma API (`npm run lint` → eslint src/**/*.ts).
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'node_modules', 'prisma', 'scripts', '*.js', '*.cjs'],
  rules: {
    // Pervasive in this codebase (80+ sites); tighten in a dedicated cleanup.
    '@typescript-eslint/no-explicit-any': 'off',
    // Report dead code without failing the build; `_`-prefixed names are intentional
    // (e.g. Express error handlers must keep the 4-arg signature).
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
  },
};
