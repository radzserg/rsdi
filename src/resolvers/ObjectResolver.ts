import AbstractResolver from "./AbstractResolver";
import { InvalidConstructorError, MethodIsMissingError } from "../errors";
import {
  ClassOf,
  DependencyResolver,
  IDIContainer,
  MethodArgs,
  WrapWithResolver,
} from "../types";
import { resolveFunctionParameters } from "../DIContainer";

interface IExtraMethods<I> {
  methodName: keyof I;
  args: any;
}

/**
 * ObjectDefinition creates objects from the provided class.
 *
 */
export default class ObjectResolver<T extends ClassOf<any>>
  extends AbstractResolver<InstanceType<T>>
  implements DependencyResolver<InstanceType<T>>
{
  private readonly constructorFunction: T;
  private deps: Array<DependencyResolver<any> | any> = [];
  private methods: IExtraMethods<InstanceType<T>>[] = [];

  constructor(constructorFunction: T) {
    super();
    if (typeof constructorFunction !== "function") {
      throw new InvalidConstructorError();
    }
    this.constructorFunction = constructorFunction;
  }

  /**
   * Defines constructor parameters for a given class.
   * @param deps
   */
  construct(
    ...deps: T extends { new (...args: infer P): any }
      ? WrapWithResolver<P>
      : never[]
  ): ObjectResolver<T> {
    this.deps = deps;
    return this;
  }

  /**
   * After DIContainer constructs object of a given class, DIContainer calls additional
   * `method`-s of a given class.
   *
   * @param methodName - string, name of a given class
   * @param args - match method signature of a given class method
   */
  method<MethodName extends keyof InstanceType<T>>(
    methodName: MethodName,
    ...args: MethodArgs<T, MethodName>
  ): ObjectResolver<T> {
    this.methods.push({
      methodName,
      args,
    });
    return this;
  }

  resolve = (
    diContainer: IDIContainer,
    parentDeps: string[] = []
  ): InstanceType<T> => {
    const constructorParameters = resolveFunctionParameters(
      diContainer,
      this.deps,
      parentDeps
    );
    const object = new this.constructorFunction(...constructorParameters);
    this.methods.forEach((method: IExtraMethods<InstanceType<T>>) => {
      const { methodName, args } = method;
      if (object[methodName] === undefined) {
        throw new MethodIsMissingError(
          object.constructor.name,
          methodName as string
        );
      }
      const resolvedArgs = resolveFunctionParameters(
        diContainer,
        args,
        parentDeps
      );
      object[methodName](...resolvedArgs);
    });

    return object;
  };
}
