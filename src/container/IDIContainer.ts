import { ResolveArg } from "../types";

export interface Resolver {
    resolve<T>(type: ResolveArg<T>): T;
}

export interface IDIContainer extends Resolver {
    get: <T>(serviceName: string) => T;
}
