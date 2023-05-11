import { DependencyResolver } from "../types";
import DIContainer from "../DIContainer";

/**
 * Keep AbstractResolver, so we can use `if (dep instanceof AbstractResolver) ` checks
 */
abstract class AbstractResolver<T = any> implements DependencyResolver<T> {
  protected parentDeps: string[] = [];
  public abstract resolve: (container: DIContainer<any>) => T;

  public setParentDependencies(parentDeps: string[]): void {
    this.parentDeps = parentDeps;
  }
}

export default AbstractResolver;
