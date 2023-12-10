import BaseDefinition from "./BaseDefinition";
import { IDIContainer, Resolver } from "../container/IDIContainer";
import { Mode } from "../types";

export type FactoryType = (container: Resolver) => any;

export default class FactoryDefinition extends BaseDefinition {
    constructor(private readonly factory: FactoryType) {
        super(Mode.TRANSIENT);
    }

    resolve<T>(container: IDIContainer): T {
        return this.factory(container);
    }
}
