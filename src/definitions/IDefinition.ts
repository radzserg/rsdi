import { IDIContainer } from "../DIContainer";

export type IDefinition<T> = {
    resolve: (container: IDIContainer, parentDeps?: string[]) => T;
};
