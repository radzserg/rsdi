import { DependencyResolver } from "./DependencyResolver";
import AbstractResolver from "./resolvers/AbstractResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import { CircularDependencyError, DependencyIsMissingError } from "./errors";
import { DefinitionName, definitionNameToString } from "./DefinitionName";

/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedResolvers {
    [x: string]: DependencyResolver | any;
}

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
     * @param definitionName - DefinitionName name of the dependency
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    get<T>(definitionName: DefinitionName, parentDeps: string[] = []): T {
        const name = definitionNameToString(definitionName);
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
    add(resolvers: INamedResolvers) {
        Object.keys(resolvers).map((name: string) => {
            this.addResolver(name, resolvers[name]);
        });
    }

    /**
     * Adds single dependency definition to the container
     * @param name - string name for the dependency
     * @param resolver - raw value or instance of IDefinition
     */
    private addResolver(
        name: DefinitionName,
        resolver: DependencyResolver | any
    ) {
        if (!(resolver instanceof AbstractResolver)) {
            resolver = new RawValueResolver(resolver);
        }
        this.resolvers[definitionNameToString(name)] = resolver;
    }
}
