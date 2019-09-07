export default class ConstructorArgumentError extends Error {
    constructor(constructorName: string, constructorArgumentsNumber: number) {
        super(
            `Constructor ${constructorName} argument error, constructor expects to get ${constructorArgumentsNumber} arguments`
        );
    }
}
