import { Mode } from "./definitions/BaseDefinition";
import { Registration } from "./registration/Registration";
import { Dependency, Implementation, Register } from "./types";

export const register = <T>(type: Register<T>) => {
    const dependencies: any[] = [];
    let mode: Mode = Mode.TRANSIENT;

    const withDependency = <T>(parameter: Dependency<T>) => {
        dependencies.push(parameter);

        return { and: withDependency, build };
    };

    const withImplementation = (parameter: Implementation<T>) => {
        return {
            build: () => buildImplementation(Mode.SINGLETON, type, parameter),
        };
    };

    const withDynamic = (parameter: Function) => {
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

    return { withDependency, withImplementation, withDynamic, build, asASingleton };
};

const buildDependency = (
    mode: Mode,
    type: any,
    parameters: any[]
): Registration => {
    const dependencies = parameters.map((parameter) => {
        return new Registration(mode, parameter, []);
    });

    return new Registration(mode, type, dependencies);
};

const buildImplementation = (mode: Mode, type: any, implementation: any) => {
    return new Registration(mode, type, [], implementation);
};
