import CustomError from "./CustomError";

export default class CircularDependencyError extends CustomError {
    constructor(name: string, path: string[]) {
        super(
            CircularDependencyError.name,
            `Circular Dependency is detected. Dependency: "${name}", path: ` +
                path.join(" -> ") +
                "."
        );
    }
}
