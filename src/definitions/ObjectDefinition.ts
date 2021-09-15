import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";
import { InvalidConstructorError, MethodIsMissingError } from "../errors";
import { IDefinition } from "./IDefinition";

export interface Type<C extends Object> {
    new (...args: any[]): C;
}

interface IExtraMethods {
    methodName: string;
    args: any;
}

type UnwrapDefinition<U> = U extends Object ? IDefinition<U> : never;
type ConstructorArgsWithDefinitions<T extends any[]> = { [K in keyof T]: T[K] | UnwrapDefinition<T[K]> }

/**
 * Definition to create object by provided class name
 */
export default class ObjectDefinition<T extends { new (...args: any[]): any }, R = InstanceType<T>>
    extends BaseDefinition<R> implements IDefinition<R>
{
    private readonly constructorFunction: T;
    private deps: Array<IDefinition<any> | any> = [];
    private methods: IExtraMethods[] = [];

    constructor(constructorFunction: T) {
        super();
        if (typeof constructorFunction !== "function") {
            throw new InvalidConstructorError();
        }
        this.constructorFunction = constructorFunction;
    }

    construct(...deps: T extends { new(...args: infer P): any } ? ConstructorArgsWithDefinitions<P> : never[]): ObjectDefinition<T, R> {
        this.deps = deps;
        return this;
    }

    method(methodName: string, ...args: any): ObjectDefinition<T, R> {
        this.methods.push({
            methodName,
            args,
        });
        return this;
    }

    resolve = (diContainer: IDIContainer, parentDeps: string[] = []): R  => {
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
