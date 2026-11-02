import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.js',
      '**/*.mjs',
      'eslint.config.mjs',
    ],
  },

  // TypeScript-aware rules for all TS/TSX files
  ...tseslint.configs.recommended,

  // Project-specific overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // React Hooks rules — downgraded to warn so pre-existing violations don't break CI
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // Console is used heavily throughout — warn only, never error
      'no-console': 'warn',

      // prefer-const — warn only; many pre-existing let declarations are not reassigned
      'prefer-const': 'warn',

      // no-use-before-define — warn only for pre-existing patterns
      'no-use-before-define': 'warn',

      // Relax some TS rules that the existing codebase routinely uses
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'warn',

      // Disallow blanket @ts-nocheck (AI-slop suppression); allow @ts-expect-error with description
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-nocheck': true,
        'ts-check': false,
        'ts-ignore': false,
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      }],

      // Disable rules that produce too many false-positives in this codebase
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  }
);
