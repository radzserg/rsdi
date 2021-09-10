import { IDIContainer } from "../DIContainer";
import { IDefinition } from "./IDefinition";

/**
 * Keep BaseDefinition so we can use `if (dep instanceof BaseDefinition) ` checks
 */
abstract class BaseDefinition<T extends any = unknown> implements IDefinition<T> {
    public abstract resolve: <Y extends T> (
        container: IDIContainer,
        parentDeps?: string[]
    ) => Y;
}

export default BaseDefinition;
