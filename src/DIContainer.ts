import { IDefinition } from "./definitions/IDefinition";
import DependencyIsMissingError from "./errors/DependencyIsMissingError";

export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedDefinitions {
    [x: string]: IDefinition;
}

export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};

    get<T>(name: string): T {
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }
        const definition: IDefinition = this.definitions[name];
        return definition.resolve<T>(this);
    }

    addDefinition(definition: IDefinition) {
        this.definitions[definition.name()] = definition;
    }

    addDefinitions(definitions: IDefinition[]) {
        this.definitions = definitions.reduce(
            (namedDefinitions: INamedDefinitions, definition: IDefinition) => {
                namedDefinitions[definition.name()] = definition;
                return namedDefinitions;
            },
            {}
        );
    }
}
