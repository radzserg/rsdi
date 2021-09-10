import { IDIContainer } from "../DIContainer";

export interface IDefinition<T extends any = unknown> {
    resolve: <Y extends T>(container: IDIContainer, parentDeps?: string[]) => Y;
}
