/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  watchman: false,
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  // Add coverageThreshold (≥80% per README) once the suite is populated.
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  globalTeardown: "<rootDir>/tests/teardown.ts",
  moduleFileExtensions: ["ts", "js", "json"],
};
