module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePaths: ["<rootDir>/src/"],
  modulePathIgnorePatterns: [
      "dist/",
      "__typetests__/",
      "fakeClasses.ts"
  ]
};