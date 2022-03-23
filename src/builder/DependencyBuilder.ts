import { Mode } from "definitions/BaseDefinition";
import { Dependency } from "definitions/Dependency";

export const register = (type: any) => {
    let dependencies: any[] = [];
    let mode: Mode = Mode.TRANSIENT;

    const withDependency = (parameter: any) => {
        dependencies.push(parameter);

        return { and: withDependency, build };
    };

    const asASingleton = () => {
        mode = Mode.SINGLETON;

        return { build };
    };

    const build = () => {
        return buildDependency(mode, type, dependencies);
    };

    return { withDependency, build, asASingleton };
};

export const build = (type: any, ...parameters: any[]): Dependency => {
    return buildDependency(Mode.TRANSIENT, type, parameters);
};

export const buildSingleton = (type: any, ...parameters: any[]): Dependency => {
    return buildDependency(Mode.SINGLETON, type, parameters);
};

const buildDependency = (
    mode: Mode,
    type: any,
    parameters: any[]
): Dependency => {
    const dependencies = parameters.map((parameter) => {
        return new Dependency(mode, parameter, []);
    });

    return new Dependency(mode, type, dependencies);
};
