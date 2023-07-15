import {
    Class,
    DependencyArg,
    ImplementationArg,
    Mode,
    RegisterType,
    Registration,
} from "./types";

export const register = <R extends string | Class>(type: R) => {
    const dependencies: any[] = [];
    let mode: Mode = Mode.TRANSIENT;

    const withDependencies = (...parameters: unknown[]) => {
        parameters.forEach((parameter) => {
            dependencies.push(parameter);
        });

        return { build };
    };

    const withDependency = <D>(parameter: DependencyArg<R, D>) => {
        dependencies.push(parameter);

        return { build };
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
        withDependencies,
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
