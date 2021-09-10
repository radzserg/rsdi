import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";
import { InvalidConstructorError, MethodIsMissingError } from "../errors";
import { IDefinition } from "./IDefinition";

export interface Type<T> {
    new (...args: any[]): T;
}

interface IExtraMethods {
    methodName: string;
    args: any;
}

/**
 * Definition to create object by provided class name
 */
export default class ObjectDefinition<T extends Object> extends BaseDefinition<T> {
    private readonly constructorFunction: Type<any>;
    private deps: Array<IDefinition<T> | any> = [];
    private methods: IExtraMethods[] = [];

    constructor(constructorFunction: Type<T>) {
        super();
        if (typeof constructorFunction !== "function") {
            throw new InvalidConstructorError();
        }
        this.constructorFunction = constructorFunction;
    }

    construct(...deps: IDefinition<T> | any): ObjectDefinition<T> {
        this.deps = deps;
        return this;
    }

    method(methodName: string, ...args: any): ObjectDefinition<T> {
        this.methods.push({
            methodName,
            args,
        });
        return this;
    }

    resolve = <Y extends T>(diContainer: IDIContainer, parentDeps: string[] = []): Y => {
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
