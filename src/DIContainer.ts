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
export interface IDIContainer {
    get: <Custom, Name extends ResolverName = ResolverName>(
        dependencyName: Name
    ) => ResolvedType<Custom, Name>;
}

interface INamedResolvers {
    [k: string]: DependencyResolver | any;
}

export type ResolverName = string | { name: string };

/**
 * Defines the type of resolved dependency
 *  - if name of Class is provided - instance type will be returned
 *  - if function is provided - function return type will be returned
 *  - if Custom type is provided - it will be returned
 *  - else any
 */
type ResolvedType<
    Custom = void,
    Name extends ResolverName = ResolverName
> = Name extends ClassOf<any>
    ? InstanceType<Name>
    : Name extends (...args: any) => infer FT
    ? FT
    : Custom extends void
    ? any
    : Custom;

/**
 * Dependency injection container
 */
export default class DIContainer implements IDIContainer {
    private resolvers: INamedResolvers = {};
    private resolved: {
        [name: string]: any;
    } = {};

    /**
     * Resolves dependency by name
     * @param dependencyName - DefinitionName name of the dependency. String or class name.
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    public get<Custom = void, Name extends ResolverName = string>(
        dependencyName: Name,
        parentDeps: string[] = []
    ): ResolvedType<Custom, Name> {
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
    public add(resolvers: INamedResolvers) {
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
