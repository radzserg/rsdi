import {
    DependencyArg,
    ImplementationArg,
    Mode,
    RegisterType,
    Registration,
} from "./types";

export const register = <R>(type: R) => {
    const dependencies: any[] = [];
    let mode: Mode = Mode.TRANSIENT;

    const withDependency = <D>(parameter: DependencyArg<R, D>) => {
        dependencies.push(parameter);

        return { and: withDependency, build };
    };

    const withImplementation = (parameter: ImplementationArg<R>) => {
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

    return {
        build,
        withImplementation,
        withDynamic,
        asASingleton,
        withDependency,
    } as unknown as RegisterType<R>;
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
