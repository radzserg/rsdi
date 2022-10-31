import { ObjectType } from "./Container";
import { Mode } from "./definitions/BaseDefinition";
import { Dependency } from "./definitions/Dependency";

export const register = <T>(type: string | ObjectType<T>) => {
    const dependencies: any[] = [];
    let mode: Mode = Mode.TRANSIENT;

    const withDependency = <T>(parameter: string | ObjectType<T>) => {
        dependencies.push(parameter);

        return { and: withDependency, build };
    };

    const withImplementation = (parameter: any | ObjectType<T>) => {
        return {
            build: () => buildImplementation(Mode.SINGLETON, type, parameter),
        };
    };

    const withDynamicValue = (parameter: any | ObjectType<T>) => {
        return {
            build: () => buildImplementation(Mode.SINGLETON, type, parameter()),
        };
    };

    const asASingleton = () => {
        mode = Mode.SINGLETON;

        return { withDependency, build };
    };

    const build = () => {
        return buildDependency(mode, type, dependencies);
    };

    return { withDependency, withImplementation, withDynamicValue, build, asASingleton };
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

const buildImplementation = (mode: Mode, type: any, implementation: any) => {
    return new Dependency(mode, type, [], implementation);
};
