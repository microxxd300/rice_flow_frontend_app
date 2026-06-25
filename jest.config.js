module.exports = {
  displayName: 'rice-flow',
  testEnvironment: 'node',
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/app': '<rootDir>/src/app',
    '^@/features': '<rootDir>/src/features',
    '^@/components': '<rootDir>/src/components',
    '^@/services': '<rootDir>/src/services',
    '^@/theme': '<rootDir>/src/theme',
    '^@/hooks': '<rootDir>/src/hooks',
    '^@/utils': '<rootDir>/src/utils',
    '^@/constants': '<rootDir>/src/constants',
    '^@/types': '<rootDir>/src/types',
    '^@/config': '<rootDir>/src/config',
  },
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest'],
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
