import { Registration, ResolveArg } from "./types";

import DIContainer from "./container/DIContainer";
import BaseDefinition from "./definitions/BaseDefinition";
import { get, object, value } from "./definitions/DefinitionBuilders";
import ImplementationIsMissingError from "./errors/ImplementationIsMissingError";

export class Container {
    private readonly container: DIContainer = new DIContainer();

    private constructor() { }

    public static register(registrations: Registration[]): void {
        this.instance.register(registrations);
    }

    public static resolve<T>(type: ResolveArg<T>): T {
        return this.instance.resolve<T>(type);
    }

    private static _instance: Container | null;
    private static get instance(): Container {
        if (!this._instance) {
            this._instance = new Container();
        }

        return this._instance;
    }

    public static dispose() {
        this._instance = null;
    }

    public register(registrations: Registration[]): void {
        for (const registration of registrations) {
            const dependencies = this.registerDependencies(registration);

            this.registerParent(registration, dependencies);
        }
    }

    public resolve<T>(type: ResolveArg<T>): T {
        if (typeof type === "string") return this.container.get<T>(type);

        return this.container.get<T>(type.name);
    }

    private registerParent(registration: Registration, dependencies: BaseDefinition[]) {
        if (typeof registration.type === "string") {
            if (!registration.implementation)
                throw new ImplementationIsMissingError(registration.type);

            this.container.addDefinition(
                registration.type,
                typeof registration.implementation === "function" ?
                    object(registration.implementation, registration.mode) :
                    value(registration.implementation)
            );

            return;
        }

        this.container.addDefinition(
            registration.type.name,
            object(registration.implementation ?? registration.type, registration.mode).construct(
                ...dependencies
            )
        );
    }

    private registerDependencies(registration: Registration) {
        const injections: BaseDefinition[] = [];

        for (const parameter of registration.dependencies) {
            const { type, mode } = parameter;

            if (typeof type === "string") {
                injections.push(get(type));

                continue;
            }

            injections.push(get(type.name));

            this.container.addDefinition(
                type.name,
                object(type, mode)
            );
        }

        return injections;
    }
}