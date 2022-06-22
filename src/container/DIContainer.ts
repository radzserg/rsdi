import { IDefinition } from "../definitions/IDefinition";
import BaseDefinition from "../definitions/BaseDefinition";
import ValueDefinition from "../definitions/ValueDefinition";
import DependencyIsMissingError from "../errors/DependencyIsMissingError";
import CircularDependencyError from "../errors/CircularDependencyError";

export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedDefinitions {
    [x: string]: IDefinition | any;
}

export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};
    private resolved: {
        [name: string]: any;
    } = {};

    get<T>(name: string, parentDeps: string[] = []): T {
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }
        if (parentDeps.includes(name)) {
            throw new CircularDependencyError(name, parentDeps);
        }

        const definition: IDefinition = this.definitions[name];

        if (definition.isSingleton() && this.resolved[name] !== undefined) {
            return this.resolved[name];
        }

        parentDeps.push(name);
        this.resolved[name] = definition.resolve<T>(this, parentDeps);
        return this.resolved[name];
    }

    addDefinition(name: string, definition: IDefinition | any) {
        if (name in this.definitions) return;

        if (!(definition instanceof BaseDefinition)) {
            definition = new ValueDefinition(definition);
        }
        this.definitions[name] = definition;
    }

    addDefinitions(definitions: INamedDefinitions) {
        Object.keys(definitions).map((name: string) => {
            this.addDefinition(name, definitions[name]);
        });
    }
}
