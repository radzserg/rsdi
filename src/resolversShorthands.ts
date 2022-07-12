import ObjectResolver from "./resolvers/ObjectResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import ReferenceResolver from "./resolvers/ReferenceResolver";
import FactoryResolver, { Factory } from "./resolvers/FactoryResolver";
import { definitionNameToString } from "./DefinitionName";
import {
  AnyNamedResolvers,
  ClassOf,
  DependencyResolver,
  ResolverName,
  ResolveUsingSelfType,
  WrapWithResolver,
} from "./types";
import FunctionResolver from "./resolvers/FunctionResolver";

/**
 * ObjectDefinition creates objects from the provided class.
 * @param classConstructor
 */
export function diObject<T extends ClassOf<any>>(classConstructor: T) {
  return new ObjectResolver(classConstructor);
}

/**
 * ValueDefinition keeps raw value of any type.
 * @param value
 */
export function diValue<T extends any = unknown>(value: T) {
  return new RawValueResolver<T>(value);
}

/**
 * Refers to existing definition. i.e. definition with provided name must exist in DIContainer.
 * Fallback to self type
 *
 * @param definitionName
 *
 */
export function diUse<Custom = void, Name extends ResolverName = ResolverName>(
  definitionName: Name
): Custom extends void
  ? DependencyResolver<ResolveUsingSelfType<Name>>
  : DependencyResolver<Custom> {
  const dependencyName = definitionNameToString<AnyNamedResolvers>(
    definitionName
  ) as Name;
  return new ReferenceResolver<AnyNamedResolvers, Name>(dependencyName) as any;
}

/**
 * FactoryResolver - allows to use custom function to build dependency
 * @param factory
 */
export function diFactory<T extends Factory>(factory: T) {
  return new FactoryResolver(factory);
}

/**
 * FunctionResolver - allows to use custom function with specified parameters, where parameters are references to
 * existing dependencies
 * @param func
 * @param parameters
 */
export function diFunc<T extends (...args: any) => any>(
  func: T,
  ...parameters: T extends (...args: infer ArgTypes) => any
    ? WrapWithResolver<ArgTypes>
    : never
) {
  return new FunctionResolver(func, ...parameters);
}
