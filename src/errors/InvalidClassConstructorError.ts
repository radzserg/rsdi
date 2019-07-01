export default class InvalidClassConstructorError extends Error
{
    constructor(err = "Invalid class constructor") {
        super(err);
    }
}