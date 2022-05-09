import AbstractResolver from "./AbstractResolver";
import { FactoryDefinitionError } from "../errors";
import { IDIContainer } from "../types";
import DIContainer from "../DIContainer";

export type Factory = (container: IDIContainer) => any;

/**
 * FactoryResolver - allows to use custom function to build dependency
 */
export default class FactoryResolver<
  T extends Factory
> extends AbstractResolver<ReturnType<T>> {
  private readonly factory: Factory;

  constructor(factory: T) {
    super();
    if (typeof factory !== "function") {
      throw new FactoryDefinitionError();
    }
    this.factory = factory;
  }

  resolve = (container: DIContainer): ReturnType<T> => {
    return this.factory(container as IDIContainer);
  };
}
