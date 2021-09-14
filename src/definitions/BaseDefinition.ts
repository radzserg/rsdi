import { IDIContainer } from "../DIContainer";
import { IDefinition } from "./IDefinition";

/**
 * Keep BaseDefinition so we can use `if (dep instanceof BaseDefinition) ` checks
 */
abstract class BaseDefinition<T = any> implements IDefinition<T> {
    public abstract resolve: (
        container: IDIContainer,
        parentDeps?: string[]
    ) => T;
}

export default BaseDefinition;
