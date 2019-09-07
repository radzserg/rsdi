export default class MethodIsMissingError extends Error {
    constructor(objectName: string, methodName: string) {
        super(
            `${methodName} is not a member of ${objectName}`
        );
    }
}
