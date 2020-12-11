import CustomError from "./CustomError";

export default class DependencyIsAlreadyDeclared extends CustomError {
    constructor(name: string) {
        super(
            DependencyIsAlreadyDeclared.name,
            `Dependency with name ${name} is already declared`
        );
    }
}
