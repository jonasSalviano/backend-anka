module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  collectCoverage: true,
  coverageReporters: ['lcov', 'text-summary'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'coverage', outputName: 'test-report.xml' }],
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
};
