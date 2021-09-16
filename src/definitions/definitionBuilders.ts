import ObjectDefinition, { Type } from "../definitions/ObjectDefinition";
import ValueDefinition from "../definitions/ValueDefinition";
import ExistingDefinition from "./ExistingDefinition";
import FactoryDefinition, { Factory } from "./FactoryDefinition";

export function diObject<T = Type<any>>(classConstructor: Type<T>) {
    return new ObjectDefinition(classConstructor);
}

export function diValue(value: string) {
    return new ValueDefinition(value);
}

export function diGet<T>(name: string) {
    return new ExistingDefinition<T>(name);
}

export function diFactory< T extends Factory>(factory: T) {
    return new FactoryDefinition(factory);
}
