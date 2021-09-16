import ObjectDefinition, { Type } from "./definitions/ObjectDefinition";
import ValueDefinition from "./definitions/ValueDefinition";
import ExistingDefinition from "./definitions/ExistingDefinition";
import FactoryDefinition, { Factory } from "./definitions/FactoryDefinition";
import { DefinitionName, definitionNameToString } from "./DefinitionName";

// shorthands for Definition classes

/**
 * ObjectDefinition creates objects from the provided class.
 * @param classConstructor
 */
export function diObject<T = Type<any>>(classConstructor: Type<T>) {
    return new ObjectDefinition(classConstructor);
}

/**
 * ValueDefinition keeps raw value of any type.
 * @param value
 */
export function diValue<T extends any = unknown>(value: T) {
    return new ValueDefinition<T>(value);
}

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 * @param definitionName
 */
export function diGet<T = void, R extends DefinitionName = string>(
    definitionName: R
) {
    return new ExistingDefinition<
        T extends void
            ? R extends { name: any }
                ? R extends Type<any>
                    ? InstanceType<R>
                    : R
                : any
            : T
    >(definitionNameToString(definitionName));
}

/**
 * FactoryDefinition - allows to use custom function to build dependency
 * @param factory
 */
export function diFactory<T extends Factory>(factory: T) {
    return new FactoryDefinition(factory);
}
