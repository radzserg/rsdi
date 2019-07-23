import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";

export type Factory = (container: IDIContainer) => any;

export default class FactoryDefinition extends BaseDefinition {
    private readonly factory: Factory;
    private value: any;

    constructor(factory: Factory) {
        super();
        this.factory = factory;
    }

    resolve = <T>(container: IDIContainer): T => {
        if (this.value !== undefined) {
            return this.value;
        }

        this.value = this.factory(container);
        return this.value;
    };
}
