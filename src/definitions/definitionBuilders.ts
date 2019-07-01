import ObjectDefinition, {Type} from "definitions/ObjectDefinition";
import InvalidClassConstructorError from "errors/InvalidClassConstructorError";
import BaseDefinition from "definitions/BaseDefinition";

function isConstructor(obj: any) {
    return !!obj.prototype && !!obj.prototype.constructor.name;
}


export function create(classConstructor: Type<any>, name: string = undefined, ...deps: BaseDefinition | any) {
    if (!isConstructor(classConstructor)) {
        throw new InvalidClassConstructorError();
    }

    console.log(deps);

    console.log(classConstructor.prototype.constructor.length);

    return new ObjectDefinition(name, classConstructor, deps)
}
