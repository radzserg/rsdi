import { DependencyResolver, IDIContainer } from "../types";

/**
 * Keep AbstractResolver so we can use `if (dep instanceof AbstractResolver) ` checks
 */
abstract class AbstractResolver<T = any> implements DependencyResolver<T> {
    public abstract resolve: (
        container: IDIContainer,
        parentDeps?: string[]
    ) => T;
}

export default AbstractResolver;
