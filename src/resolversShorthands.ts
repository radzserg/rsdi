import ObjectResolver from "./resolvers/ObjectResolver";
import RawValueResolver from "./resolvers/RawValueResolver";
import ReferenceResolver from "./resolvers/ReferenceResolver";
import FactoryResolver, { Factory } from "./resolvers/FactoryResolver";
import { DefinitionName, definitionNameToString } from "./DefinitionName";
import { ClassOf } from "./DIContainer";

// shorthands for Definition classes

/**
 * ObjectDefinition creates objects from the provided class.
 * @param classConstructor
 */
export function diObject<T = ClassOf<any>>(classConstructor: ClassOf<T>) {
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
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 * @param definitionName
 */
export function diUse<T = void, R extends DefinitionName = string>(
    definitionName: R
) {
    return new ReferenceResolver<
        T extends void
            ? R extends { name: any }
                ? R extends ClassOf<any>
                    ? InstanceType<R>
                    : R
                : any
            : T
    >(definitionNameToString(definitionName));
}

/**
 * FactoryResolver - allows to use custom function to build dependency
 * @param factory
 */
export function diFactory<T extends Factory>(factory: T) {
    return new FactoryResolver(factory);
}
