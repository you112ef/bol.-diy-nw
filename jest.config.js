/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Using 'node' because JSDOM is not strictly needed for db/hook tests, 'jsdom' for component tests
  roots: ['<rootDir>/app'],
  moduleNameMapper: {
    '~/(.*)': '<rootDir>/app/$1', // Handle ~ alias if used in imports
    'fake-indexeddb/auto': '<rootDir>/node_modules/fake-indexeddb/auto.js', // Ensure fake-indexeddb is resolved correctly
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Optional: for global setups like fake-indexeddb
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // Or your specific tsconfig for tests
    }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
