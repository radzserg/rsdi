import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";
import { InvalidConstructorError, MethodIsMissingError } from "../errors";

export interface Type<T> extends Function {
    new (...args: any[]): T;
}

interface IExtraMethods {
    methodName: string;
    args: any;
}

/**
 * Definition to create object by provided class name
 */
export default class ObjectDefinition extends BaseDefinition {
    private readonly constructorFunction: Type<any>;
    private deps: Array<BaseDefinition | any> = [];
    private methods: IExtraMethods[] = [];

    constructor(constructorFunction: Type<any>) {
        super();
        if (typeof constructorFunction !== "function") {
            throw new InvalidConstructorError();
        }
        this.constructorFunction = constructorFunction;
    }

    construct(...deps: BaseDefinition | any): ObjectDefinition {
        this.deps = deps;
        return this;
    }

    method(methodName: string, ...args: any): ObjectDefinition {
        this.methods.push({
            methodName,
            args,
        });
        return this;
    }

    resolve = <T>(diContainer: IDIContainer, parentDeps: string[] = []): T => {
        const deps = this.deps.map((dep: BaseDefinition | any) => {
            if (dep instanceof BaseDefinition) {
                return dep.resolve(diContainer, parentDeps);
            }
            return dep;
        });

        const object = new this.constructorFunction(...deps);
        this.methods.forEach((method: IExtraMethods) => {
            const { methodName, args } = method;
            if (object[methodName] === undefined) {
                throw new MethodIsMissingError(
                    object.constructor.name,
                    methodName
                );
            }
            const resolvedArgs = args.map((arg: any) => {
                if (arg instanceof BaseDefinition) {
                    return arg.resolve(diContainer);
                }
                return arg;
            });
            object[methodName](...resolvedArgs);
        });

        return object;
    };
}
