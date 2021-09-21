import { DependencyResolver } from "./DependencyResolver";
import AbstractResolver from "./resolvers/AbstractResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import { CircularDependencyError, DependencyIsMissingError } from "./errors";
import { definitionNameToString } from "./DefinitionName";

/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer<R extends INamedResolvers = {}> {
    get: <N extends string>(
        dependencyName: N
    ) => R[N] extends DependencyResolver ? Resolve<R[N]> : R[N];
}

interface INamedResolvers {
    [k: string]: DependencyResolver | any;
}

type Resolve<N extends DependencyResolver> = N extends {
    resolve(...args: any[]): infer R;
}
    ? R
    : never;

/**
 * Dependency injection container
 */
export default class DIContainer<R extends INamedResolvers = {}>
    implements IDIContainer<R> {
    private resolvers: INamedResolvers = {};
    private resolved: {
        [name: string]: any;
    } = {};

    // private constructor() {}

    /**
     * Resolves dependency by name
     * @param dependencyName - DefinitionName name of the dependency
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    public get<N extends string>(
        dependencyName: N,
        parentDeps: string[] = []
    ): R[N] extends DependencyResolver ? Resolve<R[N]> : R[N] {
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
        this: DIContainer<R>,
        resolvers: N
    ): asserts this is DIContainer<R & N> {
        Object.keys(resolvers).map((name: string) => {
            this.addResolver(name, resolvers[name]);
        });
        // this as DIContainer<R & N>;
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
        this.resolvers[definitionNameToString(name)] = resolver;
    }
}
