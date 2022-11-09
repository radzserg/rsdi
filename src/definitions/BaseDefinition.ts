import { Mode } from "../types";
import { IDIContainer } from "../container/IDIContainer";
import { IDefinition } from "./IDefinition";

export default abstract class BaseDefinition implements IDefinition {
    constructor(public readonly mode: Mode) { }

    abstract resolve<T>(
        container: IDIContainer,
        parentDeps?: string[]
    ): T;

    isSingleton(): boolean {
        return this.mode === Mode.SINGLETON;
    }
}