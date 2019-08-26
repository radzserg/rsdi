import { IDefinition } from "./definitions/IDefinition";
import DependencyIsMissingError from "./errors/DependencyIsMissingError";

export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedDefinitions {
    [x: string]: IDefinition;
}

type DefinitionName = string;

export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};
    private resolved: {
        [name: string]: any
    } = {};

    get<T>(name: string): T {
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }
        if (this.resolved[name] !== undefined) {
            return this.resolved[name];
        }

        const definition: IDefinition = this.definitions[name];
        this.resolved[name] = definition.resolve<T>(this);
        return this.resolved[name];
    }

    addDefinition(name: DefinitionName, definition: IDefinition) {
        this.definitions[name] = definition;
    }

    addDefinitions(definitions: INamedDefinitions) {
        this.definitions = {
            ...this.definitions,
            ...definitions,
        };
    }
}
