import ObjectDefinition, { Type } from "../definitions/ObjectDefinition";
import ValueDefinition from "../definitions/ValueDefinition";
import { Mode } from "./BaseDefinition";
import ExistingDefinition from "./ExistingDefinition";
import FactoryDefinition, { Factory } from "./FactoryDefinition";

export function diObject(classConstructor: Type<any>, mode?: Mode) {
    return new ObjectDefinition(classConstructor, mode);
}

export function diValue(value: any) {
    return new ValueDefinition(value);
}

export function diGet(name: string) {
    return new ExistingDefinition(name);
}

export function diFactory(factory: Factory) {
    return new FactoryDefinition(factory);
}
