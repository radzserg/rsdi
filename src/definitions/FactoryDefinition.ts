import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";
import { FactoryDefinitionError } from "../errors";

export type Factory = (container: IDIContainer) => any;

/**
 * Factory definition - custom function to resolve dependency
 */
export default class FactoryDefinition<
    T extends Factory
> extends BaseDefinition<ReturnType<T>> {
    private readonly factory: Factory;

    constructor(factory: T) {
        super();
        if (typeof factory !== "function") {
            throw new FactoryDefinitionError();
        }
        this.factory = factory;
    }

    resolve = (
        container: IDIContainer,
        _parentDeps?: string[]
    ): ReturnType<T> => {
        return this.factory(container);
    };
}
