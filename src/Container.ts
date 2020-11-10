import DIContainer from "./DIContainer";
import { Dependency } from "./definitions/Dependency";
import { get, object, value } from ".";

type ObjectType<T> = { new (...args: any[]): T };

export class Container {
    private readonly container: DIContainer = new DIContainer();

    private constructor() {}

    public register(dependencies: Dependency[]): void {
        for (const dependency of dependencies) {
            const injections = [];

            for (const parameter of dependency.parameters) {
                injections.push(get(parameter.name));

                this.container.addDefinition(parameter.name, object(parameter));
            }

            this.container.addDefinition(
                dependency.type.name,
                object(dependency.type).construct(...injections)
            );
        }
    }

    public registerInstance(type: string, instance: any) {
        this.container.addDefinition(type, value(instance));
    }

    public resolveByName<T>(type: string): T {
        return this.container.get<T>(type);
    }

    public resolve<T>(type: ObjectType<T>): T {
        return this.container.get<T>(type.name);
    }

    private static _instance: Container;
    public static get instance(): Container {
        if (!this._instance) {
            this._instance = new Container();
        }

        return this._instance;
    }
}
