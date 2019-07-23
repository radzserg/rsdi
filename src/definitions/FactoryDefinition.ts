import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";

export type Factory = (container: IDIContainer) => any;

export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;
    private isSingleton = false;
    private value: any;

    constructor(factory: Factory) {
        super();
        this.factory = factory;
    }

    /**
     * Makes factory to resolve dependency only once,
     * then resolved value will be returned
     */
    singleton() {
        this.isSingleton = true;
        return this;
    }

    resolve = <T>(container: IDIContainer): T => {
        if (!this.isSingleton) {
            return this.factory(container);
        }

        if (this.value !== undefined) {
            return this.value;
        }

        this.value = this.factory(container);
        return this.value;
    };
}
