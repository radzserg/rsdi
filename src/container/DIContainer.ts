import { IDefinition } from "../definitions/IDefinition";
import { IDIContainer } from "./IDIContainer";

import BaseDefinition from "../definitions/BaseDefinition";
import ValueDefinition from "../definitions/ValueDefinition";

import DependencyIsMissingError from "../errors/DependencyIsMissingError";
import CircularDependencyError from "../errors/CircularDependencyError";
import ObjectDefinition from "../definitions/ObjectDefinition";
import { ResolveArg } from "../types";

interface INamedDefinitions {
    [x: string]: IDefinition | any;
}

export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};
    private resolved: {
        [name: string]: any;
    } = {};

    public get<T>(name: string, parentDeps: string[] = []): T {
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }

        const definition: IDefinition = this.definitions[name];

        this.validateCircularResolution(parentDeps, name, definition);

        if (definition.isSingleton() && !!this.resolved[name]) {
            return this.resolved[name];
        }

        parentDeps.push(name);
        this.resolved[name] = definition.resolve<T>(this, parentDeps);
        return this.resolved[name];
    }

    public resolve<T>(type: ResolveArg<T>): T {
        if (typeof type === "string") return this.get<T>(type);

        return this.get<T>(type.name);
    }

    public addDefinition(name: string, definition: IDefinition | any) {
        if (name in this.definitions) return;

        if (!(definition instanceof BaseDefinition)) {
            definition = new ValueDefinition(definition);
        }
        this.definitions[name] = definition;
    }

    public addDefinitions(definitions: INamedDefinitions) {
        Object.keys(definitions).map((name: string) => {
            this.addDefinition(name, definitions[name]);
        });
    }

    private validateCircularResolution(
        parentDeps: string[],
        name: string,
        definition: IDefinition
    ) {
        if (!parentDeps.includes(name)) return;

        if (!(definition instanceof ObjectDefinition)) return;

        if (
            definition.dependencies.some((dependency) =>
                parentDeps.includes(dependency)
            )
        ) {
            throw new CircularDependencyError(name, parentDeps);
        }
    }
}
