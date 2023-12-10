import { Registration, ResolveArg } from "./types";

import DIContainer from "./container/DIContainer";
import BaseDefinition from "./definitions/BaseDefinition";
import ImplementationIsMissingError from "./errors/ImplementationIsMissingError";
import { object, value, get, factory } from "./definitions/definitionBuilders";
import { Resolver } from "./container/IDIContainer";

export abstract class Factory {
    constructor(protected readonly resolver: Resolver) {}
}

export class Container {
    private readonly container: DIContainer = new DIContainer();

    private constructor() {}

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
        return this.container.resolve(type);
    }

    private registerParent(
        registration: Registration,
        dependencies: BaseDefinition[]
    ) {
        if (this.isInterface(registration)) {
            if (!registration.implementation)
                throw new ImplementationIsMissingError(registration.type);

            this.container.addDefinition(
                registration.type,
                registration.implementation.prototype?.constructor
                    ? object(registration.implementation, registration.mode)
                    : value(registration.implementation)
            );

            return;
        }

        if (this.isFactory(registration)) {
            this.container.addDefinition(
                registration.type.name,
                factory((resolver: Resolver) => {
                    return new registration.type(resolver);
                })
            );

            return;
        }

        this.container.addDefinition(
            registration.type.name,
            object(
                registration.implementation ?? registration.type,
                registration.mode
            ).construct(...dependencies)
        );
    }

    private isFactory(registration: Registration) {
        return registration.type.prototype instanceof Factory;
    }

    private isInterface(registration: Registration) {
        return typeof registration.type === "string";
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

            this.container.addDefinition(type.name, object(type, mode));
        }

        return injections;
    }
}
