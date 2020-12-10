import BaseDefinition, { Mode } from "../definitions/BaseDefinition";
import DIContainer, { IDIContainer } from "../DIContainer";

export type Factory = (container: IDIContainer) => any;

/**
 * Factory definition - custom function to resolve dependency
 */
export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;

    constructor(factory: Factory) {
        super(Mode.SINGLETON);
        this.factory = factory;
    }

    resolve = <T>(container: DIContainer): T => {
        return this.factory(container);
    };
}
