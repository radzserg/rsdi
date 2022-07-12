import {
  DependencyResolver,
  IDIContainer,
  NamedResolvers,
  ResolveDependencyType,
  ResolverName,
  ConvertToDefinedDependencies,
  NonStrictNamedResolvers,
} from "./types";
import AbstractResolver from "./resolvers/AbstractResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import {
  CircularDependencyError,
  DependencyIsDefined,
  DependencyIsMissingError,
} from "./errors";
import { definitionNameToString } from "./DefinitionName";
import ReferenceResolver from "./resolvers/ReferenceResolver";

/**
 * Dependency injection container
 */
export default class DIContainer<ContainerResolvers extends NamedResolvers = {}>
  implements IDIContainer
{
  private resolvers: NamedResolvers = {};
  private resolvedDependencies: {
    [name: string]: any;
  } = {};

  /**
   * Resolves dependency by name
   * @param dependencyName - DefinitionName name of the dependency. String or class name.
   * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
   */
  public get<
    Name extends ResolverName<ContainerResolvers> = ResolverName<ContainerResolvers>
  >(
    dependencyName: Name,
    // @todo: move parent deps to separate method
    parentDeps: string[] = []
  ): ResolveDependencyType<ContainerResolvers, Name> {
    const name: string =
      definitionNameToString<ContainerResolvers>(dependencyName);
    if (!(name in this.resolvers)) {
      throw new DependencyIsMissingError(name);
    }
    if (parentDeps.includes(name)) {
      throw new CircularDependencyError(name, parentDeps);
    }
    if (this.resolvedDependencies[name] !== undefined) {
      return this.resolvedDependencies[name];
    }

    const definition: DependencyResolver = this.resolvers[name];
    definition.setParentDependencies([...parentDeps, name]);
    this.resolvedDependencies[name] = definition.resolve(this);
    return this.resolvedDependencies[name];
  }

  public use<
    Name extends ResolverName<ContainerResolvers> = ResolverName<ContainerResolvers>
  >(dependencyName: Name) {
    return new ReferenceResolver<ContainerResolvers, Name>(dependencyName);
  }

  /**
   * Adds multiple dependency resolvers to the container
   * @param resolvers - named dependency object
   */
  public add<N extends NonStrictNamedResolvers>(
    this: DIContainer<ContainerResolvers>,
    resolvers: N
  ): asserts this is DIContainer<
    ContainerResolvers & ConvertToDefinedDependencies<N>
  > {
    Object.keys(resolvers).forEach((name: string) => {
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
    if (this.resolvers[name]) {
      throw new DependencyIsDefined(name);
    }
    this.resolvers[name] = resolver;
  }
}

/**
 * Resolves given function parameters
 */
export function resolveFunctionParameters(
  diContainer: DIContainer,
  parameters: Array<DependencyResolver<any> | any> = [],
  parentDeps: string[] = []
) {
  return parameters.map((parameter: DependencyResolver<any> | any) => {
    if (parameter instanceof AbstractResolver) {
      parameter.setParentDependencies(parentDeps);
      return parameter.resolve(diContainer);
    }
    return parameter;
  });
}
