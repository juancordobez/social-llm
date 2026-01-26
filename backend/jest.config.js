/**
 * Jest Configuration - Backend
 * @see https://jestjs.io/docs/configuration
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test file patterns
  testMatch: [
    '**/src/__tests__/**/*.test.js',
    '**/src/**/*.spec.js',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/__tests__/**',
    '!src/functions.js',
    '!src/dev-server.js',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],

  // Timeout for tests (30s for LLM calls)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Force exit after all tests
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,
};
