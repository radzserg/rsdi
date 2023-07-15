import { Ref, Mode } from "../types";

import ObjectDefinition from "./ObjectDefinition";
import ValueDefinition from "./ValueDefinition";
import ExistingDefinition from "./ExistingDefinition";
import FactoryDefinition, { Factory } from "./FactoryDefinition";

export const object = (ctor: Ref<any>, mode?: Mode) => {
    return new ObjectDefinition(ctor, mode);
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
