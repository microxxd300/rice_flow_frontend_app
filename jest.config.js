module.exports = {
  displayName: 'rice-flow',
  // Expo's preset: babel-preset-expo transform, React Native mocks, and the
  // transformIgnorePatterns for Expo/React Native packages
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  // Only *.test / *.spec files, so __tests__/setup.ts isn't run as a suite
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
