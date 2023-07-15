import { Class, Mode } from "../types";
import BaseDefinition from "./BaseDefinition";
import { IDIContainer } from "../container/IDIContainer";
import MethodIsMissingError from "../errors/MethodIsMissingError";
import InvalidConstructorError from "../errors/InvalidConstructorError";
import ExistingDefinition from "./ExistingDefinition";

interface IExtraMethods {
    methodName: string;
    args: any;
}

export default class ObjectDefinition extends BaseDefinition {
    private readonly constructorFunction: Class<any>;
    private deps: Array<BaseDefinition | any> = [];
    private methods: IExtraMethods[] = [];

    constructor(constructorFunction: Class<any>, mode: Mode = Mode.TRANSIENT) {
        super(mode);
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

    resolve<T>(diContainer: IDIContainer, parentDeps: string[] = []): T {
        const deps = this.deps.map((dep: BaseDefinition | any) => {
            if (dep instanceof BaseDefinition) {
                return dep.resolve(diContainer, parentDeps);
            }
            return dep;
        });

        const object = this.createObject(deps);

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
    }

    get dependencies(): string[] {
        return this.deps
            .filter((dep) => dep instanceof ExistingDefinition)
            .map((dep: ExistingDefinition) => dep.name);
    }

    private createObject = (deps: Array<BaseDefinition | any>) => {
        return this.constructorFunction.prototype &&
            Object.hasOwn(this.constructorFunction.prototype, "constructor")
            ? new this.constructorFunction(...deps)
            : (this.constructorFunction as any)();
    };
}
