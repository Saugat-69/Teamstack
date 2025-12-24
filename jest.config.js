module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    '!public/js/**/*.test.js',
    '!public/js/app.js' // Exclude main app file as it requires full integration
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js'
  },
  testTimeout: 10000,
  verbose: true
};
