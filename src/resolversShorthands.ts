import ObjectResolver from "./resolvers/ObjectResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import ReferenceResolver from "./resolvers/ReferenceResolver";
import FactoryResolver, { Factory } from "./resolvers/FactoryResolver";
import { definitionNameToString } from "./DefinitionName";
import { ClassOf, ResolverName, WrapWithResolver } from "./types";
import FunctionResolver from "./resolvers/FunctionResolver";

// shorthands for Definition classes

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
 * Defines the type of resolved dependency
 *  - if Custom type is given - it will be returned
 *  - if name of Class is provided - instance type will be returned
 *  - if function is provided - function return type will be returned
 */
type ResolvedType<Custom, Name extends ResolverName> = Custom extends void
    ? Name extends string
        ? any
        : Name extends ClassOf<any>
        ? InstanceType<Name>
        : Name extends (...args: any) => infer FT
        ? FT
        : never
    : Custom;

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 * @param definitionName
 */
export function diUse<Custom = void, Name extends ResolverName = ResolverName>(
    definitionName: Name
) {
    return new ReferenceResolver<ResolvedType<Custom, Name>>(
        definitionNameToString(definitionName)
    );
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
