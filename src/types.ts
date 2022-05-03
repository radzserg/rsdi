/**
 * Dependency injection container interface to expose
 */
import RawValueResolver from "./resolvers/RawValueResolver";

export interface IDIContainer<ContainerResolvers extends NamedResolvers = {}> {
    get: <UserDefinedType = void, Name extends ResolverName = ResolverName>(
        dependencyName: Name
    ) => ResolveDependencyType<UserDefinedType, Name, ContainerResolvers>;
}

// public get<UserDefinedType = void, Name extends ResolverName = string>(
//   dependencyName: Name,
//   parentDeps: string[] = []
// ): ResolvedTypeNew<UserDefinedType, Name, ContainerResolvers> {

export type DependencyResolver<T extends any = any> = {
    resolve: (container: IDIContainer, parentDeps?: string[]) => T;
};

/**
 * Resolvers map
 * {
 *   a: new FunctionResolver(() => 123),
 *   b: new RawValueResolver("stringValue"),
 *   // and also can contain raw value declarations
 *   c: "StringValue"
 * }
 */
export interface NonStrictNamedResolvers {
    [k: string]: DependencyResolver | any;
}

/**
 * Resolvers map
 * {
 *   a: new FunctionResolver(() => 123),
 *   b: new RawValueResolver("stringValue"),
 * }
 */
export interface NamedResolvers {
    [k: string]: DependencyResolver;
}

export type ConvertToDefinedDependencies<T = NonStrictNamedResolvers> = {
    [K in keyof T]: T[K] extends DependencyResolver
        ? T[K]
        : RawValueResolver<T[K]>;
};

export type WrapWithResolver<T extends any[]> = {
    [K in keyof T]: T[K] | DependencyResolver<T[K]>;
};

type Resolve<N extends DependencyResolver> = N extends {
    resolve(...args: any[]): infer R;
}
    ? R
    : never;

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
    UserDefinedType = void,
    Name extends ResolverName = ResolverName,
    ExistingNamedResolvers extends NamedResolvers = NamedResolvers
> = Name extends ClassOf<any>
    ? InstanceType<Name>
    : Name extends (...args: any) => infer FT
    ? FT
    : UserDefinedType extends void
    ? any
    : UserDefinedType;

/**
 * Resolves types using self type
 *  - if T is a class - instance type will be returned
 *  - if T is a function - function return type will be returned
 *  - else any
 */
type ResolveUsingSelfType<T> = T extends ClassOf<any>
    ? InstanceType<T>
    : T extends (...args: any) => infer FT
    ? FT
    : any;

/**
 * Tries to resolve type based on provided name and accumulated
 * dependencies in the NamedResolvers
 */
type TryResolveUsingExistingDependencies<
    Name,
    ExistingNamedResolvers extends NamedResolvers
> = Name extends keyof NamedResolvers
    ? ExistingNamedResolvers[Name] extends DependencyResolver
        ? //? Resolve<ExistingNamedResolvers[Name]>
          Date
        : never
    : ResolveUsingSelfType<Name>;

export type ResolveDependencyType<
    UserDefinedType = void,
    Name extends ResolverName = ResolverName,
    ExistingNamedResolvers extends NamedResolvers = NamedResolvers
> = UserDefinedType extends void
    ? TryResolveUsingExistingDependencies<Name, ExistingNamedResolvers>
    : UserDefinedType;
