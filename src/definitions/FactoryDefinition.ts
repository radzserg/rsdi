import BaseDefinition, { Mode } from "./BaseDefinition";
import { IDIContainer } from "../container/DIContainer";

export type Factory = (container: IDIContainer) => any;

export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;

    constructor(factory: Factory) {
        super(Mode.SINGLETON);
        this.factory = factory;
    }

    resolve<T>(container: IDIContainer): T {
        return this.factory(container);
    }
}
