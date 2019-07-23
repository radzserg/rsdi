module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: ["<rootDir>/src/"],
  modulePathIgnorePatterns: [
      "dist/",
      "fakeClasses.ts"
  ]
};