import { IDIContainer } from "../DIContainer";

export interface IDefinition {
    resolve: <T>(container: IDIContainer, parentDeps?: string[]) => T;
}
