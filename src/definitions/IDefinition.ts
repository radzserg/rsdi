import {IDIContainer} from "DIContainer";

export interface IDefinition {
    name: () => string;
    resolve: <T>(container: IDIContainer) => T;
}
