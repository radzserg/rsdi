import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";

export type Factory = (container: IDIContainer) => any;

export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;

    constructor(factory: Factory) {
        super();
        this.factory = factory;
    }

    resolve = <T>(container: IDIContainer): T => {
        return this.factory(container);
    };
}
