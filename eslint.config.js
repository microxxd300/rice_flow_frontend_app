// ESLint 9 flat config (https://docs.expo.dev/guides/using-eslint/)
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/*', 'dist/*', '.expo/*', 'coverage/*'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // React Compiler readiness checks. The compiler is off, and `useRef(new Animated.Value(0)).current`
      // (the standard React Native animation pattern) trips `refs`, so report these as warnings.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      // An HTML-escaping rule; an apostrophe inside <Text> is fine in React Native
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Same files expo enables the TypeScript plugin for
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]);
