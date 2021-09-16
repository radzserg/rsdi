import { IDIContainer } from "../DIContainer";

export type IDefinition<T extends any = unknown> = {
    resolve: (container: IDIContainer, parentDeps?: string[]) => T;
};
