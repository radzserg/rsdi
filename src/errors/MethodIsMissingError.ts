import CustomError from "./CustomError";

export default class MethodIsMissingError extends CustomError {
    constructor(objectName: string, methodName: string) {
        super(
            MethodIsMissingError.name,
            `${methodName} is not a member of ${objectName}`
        );
    }
}
