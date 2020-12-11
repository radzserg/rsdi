import CustomError from "./CustomError";

export default class InvalidConstructorError extends CustomError {
    constructor() {
        super(
            InvalidConstructorError.name,
            `Invalid constructor have been provided`
        );
    }
}
