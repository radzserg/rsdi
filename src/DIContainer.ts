import {
    DependencyResolver,
    IDIContainer,
    INamedResolvers,
    ResolvedType,
    ResolveDependencyType,
    ResolverName,
} from "./types";
import AbstractResolver from "./resolvers/AbstractResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import { CircularDependencyError, DependencyIsMissingError } from "./errors";
import { definitionNameToString } from "./DefinitionName";

/**
 * Dependency injection container
 */
export default class DIContainer<
    ContainerResolvers extends INamedResolvers = {}
> implements IDIContainer<ContainerResolvers>
{
    private resolvers: INamedResolvers = {};
    private resolved: {
        [name: string]: any;
    } = {};

    /**
     * Resolves dependency by name
     * @param dependencyName - DefinitionName name of the dependency. String or class name.
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    public get<
        UserDefinedType = void,
        Name extends ResolverName = ResolverName
    >(
        dependencyName: Name,
        parentDeps: string[] = []
    ): ResolveDependencyType<UserDefinedType, Name, ContainerResolvers> {
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
        // @ts-ignore
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

/**
 * Resolves given function parameters
 */
export function resolveFunctionParameters(
    diContainer: IDIContainer,
    parameters: Array<DependencyResolver<any> | any> = [],
    parentDeps: string[] = []
) {
    return parameters.map((parameter: DependencyResolver<any> | any) => {
        if (parameter instanceof AbstractResolver) {
            return parameter.resolve(diContainer, parentDeps);
        }
        return parameter;
    });
}
