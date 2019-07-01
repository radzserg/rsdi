import ObjectDefinition, { Type } from "definitions/ObjectDefinition";

export function diObject(
    classConstructor: Type<any>,
    name: string = undefined
) {
    if (name === undefined) {
        name = classConstructor.name;
    }
    return new ObjectDefinition(name, classConstructor);
}
