module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePaths: ["<rootDir>/src/"],
    modulePathIgnorePatterns: [
        "dist/",
        "fakeClasses.ts"
    ],
    runner: 'jest-runner-tsd',
    testMatch: ['**/__typetests__/**/*.test.ts'],
};