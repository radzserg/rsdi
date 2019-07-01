import BaseDefinition from "definitions/BaseDefinition";
import {IDIContainer} from "DIContainer";

type Factory = (container: IDIContainer) => any;

export default class FactoryDefinition extends BaseDefinition {

    private factory: Factory;

    constructor(
        name: string,
        factory: Factory
    ) {
        super(name);
        this.factory = factory;
    }

    resolve = <T>(container: IDIContainer): T => {
       return this.factory(container);
    };
}
