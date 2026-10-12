// Mirrors the "@/*" path alias in tsconfig.json, which Metro reads on its own but Jest does not.
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  projects: [
    {
      displayName: 'node',
      preset: 'jest-expo/node',
      moduleNameMapper,
      testMatch: ['<rootDir>/src/bill/**/*.test.ts', '<rootDir>/src/storage/**/*.test.ts'],
    },
    {
      displayName: 'android',
      preset: 'jest-expo/android',
      moduleNameMapper,
      testMatch: ['<rootDir>/src/screens/**/*.test.tsx'],
    },
  ],
};
