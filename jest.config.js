/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
export default {
  testEnvironment: 'node',
  testMatch: ['**/*.spec.js'],
  transform: {
    '^.+\\.[t|j]sx?$': 'babel-jest'
  },
  fakeTimers: {
    enableGlobally: true
  },
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};
