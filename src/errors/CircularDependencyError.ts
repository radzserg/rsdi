export default class CircularDependencyError extends Error {
    constructor(name: string, path: string[]) {
        super(`Circular Dependency is detected. Dependency: "${name}", path: ` + path.join(' -> ') + '.');
    }
}
