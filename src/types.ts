/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer {
    get: <Custom, Name extends ResolverName = ResolverName>(
        dependencyName: Name
    ) => ResolvedType<Custom, Name>;
}

export type DependencyResolver<T extends any = unknown> = {
    resolve: (container: IDIContainer, parentDeps?: string[]) => T;
};

export type WrapWithResolver<T extends any[]> = {
    [K in keyof T]: T[K] | DependencyResolver<T[K]>;
};

export type ResolverName = string | { name: string };

export type ParametersWithResolver<T extends (...args: any) => any> =
    T extends (...args: infer P) => any ? WrapWithResolver<P> : never;

export interface ClassOf<C extends Object> {
    new (...args: any[]): C;
}

export type MethodArgs<
    T extends ClassOf<any>,
    K extends keyof InstanceType<T>
> = ParametersWithResolver<InstanceType<T>[K]>;

/**
 * Defines the type of resolved dependency
 *  - if name of Class is provided - instance type will be returned
 *  - if function is provided - function return type will be returned
 *  - if Custom type is provided - it will be returned
 *  - else any
 */
export type ResolvedType<
    Custom = void,
    Name extends ResolverName = ResolverName
> = Name extends ClassOf<any>
    ? InstanceType<Name>
    : Name extends (...args: any) => infer FT
    ? FT
    : Custom extends void
    ? any
    : Custom;
