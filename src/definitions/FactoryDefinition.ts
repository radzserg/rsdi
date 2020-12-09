import BaseDefinition from "../definitions/BaseDefinition";
import DIContainer, { IDIContainer } from "../DIContainer";
import { FactoryDefinitionError } from "../errors";

export type Factory = (container: IDIContainer) => any;

/**
 * Factory definition - custom function to resolve dependency
 */
export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;

    constructor(factory: Factory) {
        super();
        if (typeof factory !== "function") {
            throw new FactoryDefinitionError();
        }
        this.factory = factory;
    }

    resolve = <T>(container: DIContainer): T => {
        return this.factory(container);
    }
}
