import ObjectResolver from "./resolvers/ObjectResolver";

export type AnyNamedResolvers = { [k: string]: DependencyResolver<any> };

export interface IDIContainer<
  ContainerResolvers extends NamedResolvers = AnyNamedResolvers
> {
  get: <
    UserDefinedType = void,
    Name extends ResolverName<ContainerResolvers> = ResolverName<ContainerResolvers>
  >(
    dependencyName: Name
  ) => ResolveDependencyType<UserDefinedType, ContainerResolvers, Name>;
}

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
export type NonStrictNamedResolvers = {
  [k: string]: DependencyResolver | any;
};

/**
 * Resolvers map
 * {
 *   a: new FunctionResolver(() => 123),
 *   b: new RawValueResolver("stringValue"),
 * }
 */
export type NamedResolvers = {
  [k: string]: DependencyResolver;
};

export type ConvertToDefinedDependencies<T = NonStrictNamedResolvers> = {
  [K in keyof T]: T[K] extends DependencyResolver
    ? T[K]
    : DependencyResolver<T[K]>;
};

export type WrapWithResolver<T extends any[]> = {
  [K in keyof T]: T[K] | DependencyResolver<T[K]>;
};

type Resolve<N extends DependencyResolver> = N extends {
  resolve(...args: any[]): infer R;
}
  ? R
  : never;

export type FetchClasses<
  ContainerResolvers extends NamedResolvers = AnyNamedResolvers
> = {
  [P in keyof ContainerResolvers]: ContainerResolvers[P] extends ObjectResolver<
    ClassOf<any>
  >
    ? ContainerResolvers[P] extends ObjectResolver<infer X>
      ? X
      : never
    : never;
}[keyof ContainerResolvers];

export type ResolverName<
  ContainerResolvers extends NamedResolvers = AnyNamedResolvers
> =
  | keyof ContainerResolvers
  | { name: keyof ContainerResolvers }
  | FetchClasses<ContainerResolvers>;

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
 * Resolves types using self type
 *  - if T is a class - instance type will be returned
 *  - if T is a function - function return type will be returned
 *  - else any
 */
export type ResolveUsingSelfType<T> = T extends ClassOf<any>
  ? InstanceType<T>
  : T extends (...args: any) => infer FT
  ? FT
  : never;

/**
 * Tries to resolve type based on provided name and accumulated
 * dependencies in the NamedResolvers
 */
export type TryResolveUsingExistingResolvers<
  Name,
  ExistingNamedResolvers extends NamedResolvers
> = Name extends keyof NamedResolvers
  ? ExistingNamedResolvers[Name] extends DependencyResolver
    ? Resolve<ExistingNamedResolvers[Name]>
    : never
  : never;

/**
 * Resolve dependency type
 *  - tries to resolve using already defined dependencies
 *  - reties to resolve using custom type,
 *      substituted by TS  - const a: MyType = container.get("name")
 *      or explicitly provided const a = container.get<MyType>("name")
 *  - tries to resolve using self type. If a class or function is provided
 *      instance of a class or function return type will be returned
 */
export type ResolveDependencyType<
  UserDefinedType = void,
  ExistingNamedResolvers extends NamedResolvers = NamedResolvers,
  Name extends ResolverName<ExistingNamedResolvers> = ResolverName<ExistingNamedResolvers>
> = TryResolveUsingExistingResolvers<Name, ExistingNamedResolvers> extends never
  ? UserDefinedType extends void
    ? ResolveUsingSelfType<Name>
    : UserDefinedType
  : TryResolveUsingExistingResolvers<Name, ExistingNamedResolvers>;
