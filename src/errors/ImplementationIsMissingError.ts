import CustomError from "./CustomError";

export default class ImplementationIsMissingError extends CustomError {
    constructor(type: string) {
        super(
            ImplementationIsMissingError.name,
            `You must define implementation for ${type} because this type is a string`
        );
    }
}
