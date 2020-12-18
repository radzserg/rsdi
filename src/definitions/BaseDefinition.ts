import { IDIContainer } from "container/DIContainer";
import { IDefinition } from "./IDefinition";

abstract class BaseDefinition implements IDefinition {
    constructor(public readonly mode: Mode) {}

    public abstract resolve: <T>(container: IDIContainer, parentDeps?: string[]) => T;

    public isSingleton = (): boolean => {
        return this.mode === Mode.SINGLETON;
    }
}

export default BaseDefinition;

export enum Mode {
    SINGLETON,
    TRANSIENT
}
