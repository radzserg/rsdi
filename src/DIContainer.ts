import { DependencyResolver } from "./DependencyResolver";
import AbstractResolver from "./resolvers/AbstractResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import { CircularDependencyError, DependencyIsMissingError } from "./errors";
import { definitionNameToString } from "./DefinitionName";

export interface ClassOf<C extends Object> {
    new (...args: any[]): C;
}

/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer<ContainerResolvers extends INamedResolvers = {}> {
    get: <Custom = void, Name extends ResolverName = ResolverName>(
        dependencyName: Name
    ) => ResolvedType<Custom, Name, ContainerResolvers>;
}

interface INamedResolvers {
    [k: string]: DependencyResolver | any;
}

type Resolve<N extends DependencyResolver> = N extends {
    resolve(...args: any[]): infer R;
}
    ? R
    : never;

export type ResolverName = string | { name: string };

/**
 * Defines the type of resolved dependency
 *  - if Custom type is given - it will be returned
 *  - if name of Class is provided - instance type will be returned
 *  - if function is provided - function return type will be returned
 */
type ResolvedType<
    Custom,
    Name extends ResolverName,
    NamedResolvers extends INamedResolvers
> = Custom extends void
    ? Name extends string
        ? NamedResolvers[Name] extends DependencyResolver
            ? Resolve<NamedResolvers[Name]>
            : NamedResolvers[Name]
        : Name extends ClassOf<any>
        ? InstanceType<Name>
        : Name extends (...args: any) => infer FT
        ? FT
        : never
    : Custom;

/**
 * Dependency injection container
 */
export default class DIContainer<
    ContainerResolvers extends INamedResolvers = {}
> implements IDIContainer<ContainerResolvers> {
    private resolvers: INamedResolvers = {};
    private resolved: {
        [name: string]: any;
    } = {};

    /**
     * Resolves dependency by name
     * @param dependencyName - DefinitionName name of the dependency. String or class name.
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    public get<Custom = void, Name extends ResolverName = ResolverName>(
        dependencyName: Name,
        parentDeps: string[] = []
    ): ResolvedType<Custom, Name, ContainerResolvers> {
        const name = definitionNameToString(dependencyName);
        if (!(name in this.resolvers)) {
            throw new DependencyIsMissingError(name);
        }
        if (parentDeps.includes(name)) {
            throw new CircularDependencyError(name, parentDeps);
        }
        if (this.resolved[name] !== undefined) {
            return this.resolved[name];
        }

        const definition: DependencyResolver = this.resolvers[name];
        this.resolved[name] = definition.resolve(this, [...parentDeps, name]);
        return this.resolved[name];
    }

    /**
     * Adds multiple dependency resolvers to the container
     * @param resolvers - named dependency object
     */
    public add<N extends INamedResolvers>(
        this: DIContainer<ContainerResolvers>,
        resolvers: N
    ): asserts this is DIContainer<ContainerResolvers & N> {
        Object.keys(resolvers).map((name: string) => {
            this.addResolver(name, resolvers[name]);
        });
    }

    /**
     * Adds single dependency definition to the container
     * @param name - string name for the dependency
     * @param resolver - raw value or instance of IDefinition
     */
    private addResolver(name: string, resolver: DependencyResolver | any) {
        if (!(resolver instanceof AbstractResolver)) {
            resolver = new RawValueResolver(resolver);
        }
        this.resolvers[name] = resolver;
    }
}
