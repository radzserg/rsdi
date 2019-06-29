import {IDefinition} from "definitions/IDefinition";

export interface IDIContainer {
  get: <T>(serviceName: string) => T;
  // set: (serviceName: string, value: any) => IDIContainer;
  // registerClass: (className: object) => IDIContainer;
}

interface INamedDefinitions {
  [x: string]: IDefinition;
}

export default class DIContainer implements IDIContainer {
  private definitions: INamedDefinitions = {};

  get<T>(name: string): T {
    if (!(name in this.definitions)) {
      throw new Error(`Dependency with name ${name} is not defined`)
    }
    const definition: IDefinition = this.definitions[name];
    return definition.resolve<T>();
  };

  addDefinitions(definitions: IDefinition[]) {
    this.definitions = definitions.reduce((namedDefinitions: INamedDefinitions, definition: IDefinition) => {
      namedDefinitions[definition.name()] = definition;
      return namedDefinitions;
    }, {});
  }

  /**
  set(key: any, value: any) {
    // @ts-ignore
    this.deps[key] = value;
    return this;
  }

  get(key: any) {
    // @ts-ignore
    if (!this.deps[key]) {
      throw new Error(`Missing dependency: ${key}`);
    }
    // @ts-ignore
    return this.deps[key];
  }
   */
}

