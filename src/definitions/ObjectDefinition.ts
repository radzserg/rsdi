import BaseDefinition from "../definitions/BaseDefinition";
import ConstructorArgumentError from "../errors/ConstructorArgumentError";
import {IDIContainer} from "../DIContainer";

export interface Type<T> extends Function {
    new (...args: any[]): T;
}

export default class ObjectDefinition extends BaseDefinition {
    private readonly constructorFunction: Type<any>;
    private deps: Array<BaseDefinition | any> = [];

    constructor(
        name: string,
        constructorFunction: Type<any>
    ) {
        super(name);
        this.constructorFunction = constructorFunction;
    }

    construct(...deps: BaseDefinition | any): ObjectDefinition {
        const constructorArgumentsNumber = this.constructorFunction.prototype.constructor.length;
        if (constructorArgumentsNumber !== deps.length) {
            throw new ConstructorArgumentError(constructorArgumentsNumber);
        }
        this.deps = deps;
        return this;
    }

    resolve = <T>(diContainer: IDIContainer): T => {
        const deps = this.deps.map((dep: BaseDefinition | any) => {
            if (dep instanceof BaseDefinition) {
                return dep.resolve(diContainer);
            }
            return dep;
        });
        return new this.constructorFunction(...deps);
    };
}
