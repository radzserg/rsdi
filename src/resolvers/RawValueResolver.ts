import AbstractResolver from "./AbstractResolver";

/**
 * ValueDefinition keeps raw value of any type.
 *
 */
export default class RawValueResolver<
  T extends any
> extends AbstractResolver<T> {
  private readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  resolve = (): T => {
    return this.value;
  };
}
