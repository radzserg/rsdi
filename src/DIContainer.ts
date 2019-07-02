import { IDefinition } from "./definitions/IDefinition";
import DependencyIsMissingError from "./errors/DependencyIsMissingError";

export interface IDIContainer {
    get: <T>(serviceName: string) => T;
    addDefinition: (name: DefinitionName, definition: IDefinition) => void;
    addDefinitions: (definitions: INamedDefinitions) => void;
}

interface INamedDefinitions {
    [x: string]: IDefinition;
}

type DefinitionName = string;

export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};

    get<T>(name: string): T {
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }
        const definition: IDefinition = this.definitions[name];
        return definition.resolve<T>(this);
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
