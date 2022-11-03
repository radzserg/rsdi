import { IDIContainer } from "../container/IDIContainer";

export interface IDefinition {
    resolve: <T>(container: IDIContainer, parentDeps?: string[]) => T;
    isSingleton: () => boolean;
}
