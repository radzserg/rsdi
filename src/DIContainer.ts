import { IDefinition } from "./IDefinition";
import BaseDefinition from "./definitions/BaseDefinition";
import ValueDefinition from "./definitions/ValueDefinition";
import { CircularDependencyError, DependencyIsMissingError } from "./errors";
import {
    DefinitionName,
    definitionNameToString,
} from "./DefinitionName";

/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedDefinitions {
    [x: string]: IDefinition | any;
}

/**
 * Dependency injection container
 */
export default class DIContainer implements IDIContainer {
    private definitions: INamedDefinitions = {};
    private resolved: {
        [name: string]: any;
    } = {};

    /**
     * Resolves dependency by name
     * @param definitionName - DefinitionName name of the dependency
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
    get<T>(definitionName: DefinitionName, parentDeps: string[] = []): T {
        const name = definitionNameToString(definitionName);
        if (!(name in this.definitions)) {
            throw new DependencyIsMissingError(name);
        }
        if (parentDeps.includes(name)) {
            throw new CircularDependencyError(name, parentDeps);
        }
        if (this.resolved[name] !== undefined) {
            return this.resolved[name];
        }

        const definition: IDefinition = this.definitions[name];
        this.resolved[name] = definition.resolve(this, [...parentDeps, name]);
        return this.resolved[name];
    }

    /**
     * Adds single dependency definition to the container
     * @param name - string name for the dependency
     * @param definition - raw value or instance of IDefinition
     */
    addDefinition(name: DefinitionName, definition: IDefinition | any) {
        if (!(definition instanceof BaseDefinition)) {
            definition = new ValueDefinition(definition);
        }
        this.definitions[definitionNameToString(name)] = definition;
    }

    /**
     * Adds multiple dependency definitions to the container
     * @param definitions - named dependency object
     */
    addDefinitions(definitions: INamedDefinitions) {
        Object.keys(definitions).map((name: DefinitionName) => {
            this.addDefinition(name, definitions[definitionNameToString(name)]);
        });
    }
}
