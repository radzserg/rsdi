module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: ["<rootDir>/src/"],
  modulePathIgnorePatterns: [
      "fakeClasses.ts"
  ]
};