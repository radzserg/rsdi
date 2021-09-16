import BaseDefinition from "../definitions/BaseDefinition";
import { IDIContainer } from "../DIContainer";
import { InvalidConstructorError, MethodIsMissingError } from "../errors";
import { IDefinition } from "../IDefinition";

export interface ClassOf<C extends Object> {
    new (...args: any[]): C;
}

interface IExtraMethods<I> {
    methodName: keyof I;
    args: any;
}

type WithDefinitions<T extends any[]> = {
    [K in keyof T]: T[K] | IDefinition<T[K]>;
};
type ParametersWithDefinition<T extends (...args: any) => any> = T extends (
    ...args: infer P
) => any
    ? WithDefinitions<P>
    : never;
type MethodArgs<
    T extends ClassOf<any>,
    K extends keyof InstanceType<T>
> = ParametersWithDefinition<InstanceType<T>[K]>;

/**
 * ObjectDefinition creates objects from the provided class.
 *
 */
export default class ObjectDefinition<T extends ClassOf<any>>
    extends BaseDefinition<InstanceType<T>>
    implements IDefinition<InstanceType<T>> {
    private readonly constructorFunction: T;
    private deps: Array<IDefinition<any> | any> = [];
    private methods: IExtraMethods<InstanceType<T>>[] = [];

    constructor(constructorFunction: T) {
        super();
        if (typeof constructorFunction !== "function") {
            throw new InvalidConstructorError();
        }
        this.constructorFunction = constructorFunction;
    }

    /**
     * Defines constructor parameters for a given class.
     * @param deps
     */
    construct(
        ...deps: T extends { new (...args: infer P): any }
            ? WithDefinitions<P>
            : never[]
    ): ObjectDefinition<T> {
        this.deps = deps;
        return this;
    }

    /**
     * After DIContainer constructs object of a given class, DIContainer calls additional
     * `method`-s of a given class.
     *
     * @param methodName - string, name of a given class
     * @param args - match method signature of a given class method
     */
    method<MethodName extends keyof InstanceType<T>>(
        methodName: MethodName,
        ...args: MethodArgs<T, MethodName>
    ): ObjectDefinition<T> {
        this.methods.push({
            methodName,
            args,
        });
        return this;
    }

    resolve = (
        diContainer: IDIContainer,
        parentDeps: string[] = []
    ): InstanceType<T> => {
        const deps = this.deps.map((dep: BaseDefinition | any) => {
            if (dep instanceof BaseDefinition) {
                return dep.resolve(diContainer, parentDeps);
            }
            return dep;
        });

        const object = new this.constructorFunction(...deps);
        this.methods.forEach((method: IExtraMethods<InstanceType<T>>) => {
            const { methodName, args } = method;
            if (object[methodName] === undefined) {
                throw new MethodIsMissingError(
                    object.constructor.name,
                    methodName as string
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
