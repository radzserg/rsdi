import BaseDefinition from "definitions/BaseDefinition";

export interface Type<T> extends Function {
    new (...args: any[]): T;
}

export default class ObjectDefinition extends BaseDefinition
{
    private readonly constructorFunction: Type<any>;
    private readonly deps: Array<BaseDefinition | any>;

    constructor(name: string, constructorFunction: Type<any>, ...deps: BaseDefinition | any) {
        super(name);
        this.constructorFunction = constructorFunction;
        this.deps = deps;
    }

    resolve = <T>(): T => {
        const deps = this.deps.map((dep: BaseDefinition | any) => {
            if (dep instanceof BaseDefinition) {
                return dep.resolve();
            }
            return dep;
        });
        return new this.constructorFunction(...deps);
    };
}
