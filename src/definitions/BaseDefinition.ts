import { IDIContainer } from "../container/IDIContainer";
import { IDefinition } from "./IDefinition";

abstract class BaseDefinition implements IDefinition {
    constructor(public readonly mode: Mode) { }

    abstract resolve<T>(
        container: IDIContainer,
        parentDeps?: string[]
    ): T;

    isSingleton(): boolean {
        return this.mode === Mode.SINGLETON;
    }
}

export default BaseDefinition;

export enum Mode {
    SINGLETON,
    TRANSIENT,
}
