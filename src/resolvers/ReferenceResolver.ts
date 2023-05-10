import AbstractResolver from "./AbstractResolver";
import DIContainer from "../DIContainer";
import {
  AnyNamedResolvers,
  NamedResolvers,
  ResolveDependencyType,
  ResolverName,
} from "../types";

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 */
export default class ReferenceResolver<
  ExistingNamedResolvers extends NamedResolvers = AnyNamedResolvers,
  Name extends ResolverName<ExistingNamedResolvers> = ResolverName<ExistingNamedResolvers>
> extends AbstractResolver<
  ResolveDependencyType<ExistingNamedResolvers, Name>
> {
  private readonly existingDefinitionName: Name;

  constructor(existingDefinitionName: Name) {
    super();
    this.existingDefinitionName = existingDefinitionName;
  }

  resolve = (
    container: DIContainer<ExistingNamedResolvers>
  ): ResolveDependencyType<ExistingNamedResolvers, Name> => {
    const resolved =  container.get(this.existingDefinitionName, this.parentDeps);
    return resolved;
  };
}
