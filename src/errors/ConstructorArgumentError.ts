export default class ConstructorArgumentError extends Error {
    constructor(constructorArgumentsNumber: number) {
        super(
            `Constructor argument error, constructor expects to get ${constructorArgumentsNumber} arguments`
        );
    }
}
