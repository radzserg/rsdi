import { IDefinition } from "definitions/IDefinition";
import BaseDefinition from "definitions/BaseDefinition";
import ValueDefinition from "definitions/ValueDefinition";
import DependencyIsMissingError from "errors/DependencyIsMissingError";
import CircularDependencyError from "errors/CircularDependencyError";
import DependencyIsAlreadyDeclared from "errors/DependencyIsAlreadyDeclared";

/**
 * Dependency injection container interface to expose
 */
export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}

interface INamedDefinitions {
    [x: string]: IDefinition | any;
}

type DefinitionName = string;

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
     * @param name - string name of the dependency
     * @param parentDeps - array of parent dependencies (used to detect circular dependencies)
     */
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

    /**
     * Adds single dependency definition to the container
     * @param name - string name for the dependency
     * @param definition - raw value or instance of IDefinition
     */
    addDefinition(name: DefinitionName, definition: IDefinition | any) {
        if (name in this.definitions) {
            throw new DependencyIsAlreadyDeclared(name);
        }
        if (!(definition instanceof BaseDefinition)) {
            definition = new ValueDefinition(definition);
        }
        this.definitions[name] = definition;
    }

    /**
     * Adds multiple dependency definitions to the container
     * @param definitions - named dependency object
     */
    addDefinitions(definitions: INamedDefinitions) {
        Object.keys(definitions).map((name: string) => {
            this.addDefinition(name, definitions[name]);
        });
    }
}
