import { Mode } from "../definitions/BaseDefinition";
import { Dependency } from "../definitions/Dependency";

export const build = (type: any, ...parameters: any[]): Dependency => {
    return buildDependency(Mode.TRANSIENT, type, parameters);
};

export const buildSingleton = (type: any, ...parameters: any[]): Dependency => {
    return buildDependency(Mode.SINGLETON, type, parameters);
};

const buildDependency = (mode: Mode, type: any, parameters: any[]): Dependency => {
    const dependencies = parameters.map(parameter => {
        return new Dependency(mode , parameter, []);
    });

    return new Dependency(mode, type, dependencies);
};