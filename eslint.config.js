// eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';

export default [
  // Core recommended configs
  js.configs.recommended,
  ...ts.configs.recommended,
  react.configs.flat.recommended,

  // Next.js rules
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Project overrides
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // add any custom rules you like here
    },
  },
];