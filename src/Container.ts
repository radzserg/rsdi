import DIContainer from "./container/DIContainer";
import { get, object, value } from "./definitions/DefinitionBuilders";
import { Dependency } from "./definitions/Dependency";

export type ObjectType<T> = { new(...args: any[]): T };

export type Resolve<T> = string | symbol | ObjectType<T>;

export class Container {
    private readonly container: DIContainer = new DIContainer();

    private constructor() { }

    public register(dependencies: Dependency[]): void {
        for (const dependency of dependencies) {
            const injections = [];

            for (const parameter of dependency.parameters) {
                if (typeof parameter.type === "string") {
                    injections.push(get(parameter.type));

                    continue;
                }

                injections.push(get(parameter.type.name));

                this.container.addDefinition(
                    parameter.type.name,
                    object(parameter.type, parameter.mode)
                );
            }

            if (typeof dependency.type === "string") {
                this.container.addDefinition(
                    dependency.type,
                    value(dependency.implementation!)
                );

                continue;
            }

            if (dependency.implementation) {
                this.container.addDefinition(
                    dependency.type.name,
                    object(
                        dependency.implementation,
                        dependency.mode
                    ).construct(...injections)
                );

                continue;
            }

            this.container.addDefinition(
                dependency.type.name,
                object(dependency.type, dependency.mode).construct(
                    ...injections
                )
            );
        }
    }

    public registerInstance(type: string, instance: any) {
        this.container.addDefinition(type, value(instance));
    }

    public resolve<T>(type: Resolve<T>): T {
        if (typeof type === "string") return this.container.get<T>(type);
        if (typeof type === "symbol") return this.container.get<T>(type.toString());

        return this.container.get<T>(type.name);
    }

    private static _instance: Container | null;
    public static get instance(): Container {
        if (!this._instance) {
            this._instance = new Container();
        }

        return this._instance;
    }

    public static dispose() {
        this._instance = null;
    }
}
