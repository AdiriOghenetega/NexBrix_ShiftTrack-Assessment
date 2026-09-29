/**
 * Jest configuration for ShiftTrack.
 *
 * The unit-test suite targets the pure TypeScript layers (entities, use cases,
 * repositories and timers). It runs on the plain Node environment so that the
 * domain logic can be verified without booting React Native/native modules.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // `babel-preset-expo` rewrites static `process.env.EXPO_PUBLIC_*` reads into
  // an ESM import of `expo/virtual/env`, so that one Expo file must be
  // transformed instead of being ignored like the rest of node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!(?:expo|@expo|expo-.*|@expo-.*|react-native|react-native-.*|@react-native|@react-native-.*)/)',
  ],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts', '<rootDir>/src/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/core/**/*.ts',
    'src/infrastructure/**/*.ts',
    '!src/infrastructure/api/mockDatabase.ts',
    '!**/*.d.ts',
  ],
  clearMocks: true,
  verbose: true,
};
