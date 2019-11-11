export default class InvalidConstructorError extends Error {
    constructor() {
        super(`Invalid constructor have been provided`);
    }
}
