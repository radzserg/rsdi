import ObjectDefinition, { Type } from "./ObjectDefinition";
import ValueDefinition from "./ValueDefinition";
import { Mode } from "./BaseDefinition";
import ExistingDefinition from "./ExistingDefinition";
import FactoryDefinition, { Factory } from "./FactoryDefinition";

export const object = (classConstructor: Type<any>, mode?: Mode) => {
    return new ObjectDefinition(classConstructor, mode);
};

export const value = (value: any) => {
    return new ValueDefinition(value);
};

export const get = (name: string) => {
    return new ExistingDefinition(name);
};

export const factory = (factory: Factory) => {
    return new FactoryDefinition(factory);
};
