export default class CustomError extends Error {
    constructor(errorName: string, message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = errorName;
    }
}
