module.exports = {
  projects: [
    {
      displayName: 'node',
      preset: 'jest-expo/node',
      testMatch: ['<rootDir>/src/bill/**/*.test.ts', '<rootDir>/src/storage/**/*.test.ts'],
    },
    {
      displayName: 'android',
      preset: 'jest-expo/android',
      testMatch: ['<rootDir>/src/ui/**/*.test.tsx'],
    },
  ],
};
