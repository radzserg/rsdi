export enum Mode {
    SINGLETON,
    TRANSIENT,
}

export class Registration {
    public constructor(
        public readonly mode: Mode,
        public readonly type: any,
        public readonly dependencies: Registration[],
        public readonly implementation?: any
    ) {}
}

export interface Class<T> extends Function {
    new (...args: any[]): T;
}

//Args
export type ResolveArg<T> = string | Class<T>;

export type DependencyArg<R, T> = R extends string
    ? never
    : string | Function | Class<T>;

export type ImplementationArg<R> = R extends string
    ? Function | Class<unknown> | object
    : unknown;

//Fluent API
export interface Build {
    build: () => Registration;
}

interface WithDependency<R> extends Build {
    withDependency: <D>(parameter: DependencyArg<R, D>) => And<R>;
}

interface And<R> extends Build {
    and: <D>(parameter: DependencyArg<R, D>) => And<R>;
}

interface WithImplementation<R> extends Build {
    withImplementation: (parameter: ImplementationArg<R>) => Build;
}

interface asASingleton<R> extends Build {
    asASingleton: () => WithDependency<R>;
}

interface StringRegisterType<R> {
    withImplementation: (parameter: ImplementationArg<R>) => Build;
    withDynamic: (parameter: Function) => Build;
}

interface FunctionRegisterType<R>
    extends asASingleton<R>,
        WithImplementation<R>,
        WithDependency<R> {}

export type RegisterType<R> = R extends string
    ? StringRegisterType<R>
    : FunctionRegisterType<R>;
