import { IDIContainer } from "../container/DIContainer";

export interface IDefinition {
    resolve: <T>(container: IDIContainer, parentDeps?: string[]) => T;
    isSingleton: () => boolean;
}
