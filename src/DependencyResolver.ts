import { IDIContainer } from "./DIContainer";

export type DependencyResolver<T extends any = unknown> = {
    resolve: (container: IDIContainer, parentDeps?: string[]) => T;
};
