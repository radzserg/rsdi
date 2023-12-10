import { Resolver } from "./container/IDIContainer";

export enum Mode {
    SINGLETON,
    TRANSIENT,
}

export class Registration {
    public constructor(
        public readonly mode: Mode,
        public readonly type: any,
        public readonly dependencies: Registration[],
        public readonly implementation?: any
    ) {}
}

export type Class = abstract new (...args: any) => any;

export interface Ref<T> extends Function {
    new (...args: any[]): T;
}

export type ResolveArg<T> = string | Ref<T>;

export type DependencyArg<R, T> = R extends string
    ? never
    : string | Function | Ref<T>;

export type ImplementationArg<R> = R extends string
    ? Function | Class | object
    : unknown;

export interface Build {
    build: () => Registration;
}

export type ConstructorTypes<T> = T extends abstract new (
    ...args: infer P
) => any
    ? ConstructorParameters<T>
    : never;

type Length<T extends Array<any>> = T extends { length: infer L } ? L : never;

type TypedFunction<T> = () => T;

type Dep<R, N> = N extends number
    ?
          | string // Reference of an object previously registered
          | Ref<ConstructorTypes<R>[N]> // Class reference
          | Typed<Ref<ConstructorTypes<R>[N]>> // Class instance
          | TypedFunction<Typed<Ref<ConstructorTypes<R>[N]>>> // Function return instance
    : never;

interface SevenDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 7
            ? [
                  Dep<R, 0>,
                  Dep<R, 1>,
                  Dep<R, 2>,
                  Dep<R, 3>,
                  Dep<R, 4>,
                  Dep<R, 5>,
                  Dep<R, 6>
              ]
            : never
    ) => Build;
}

interface SixDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 6
            ? [Dep<R, 0>, Dep<R, 1>, Dep<R, 2>, Dep<R, 3>, Dep<R, 4>, Dep<R, 5>]
            : never
    ) => Build;
}

interface FiveDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 5
            ? [Dep<R, 0>, Dep<R, 1>, Dep<R, 2>, Dep<R, 3>, Dep<R, 4>]
            : never
    ) => Build;
}

interface FourDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 4
            ? [Dep<R, 0>, Dep<R, 1>, Dep<R, 2>, Dep<R, 3>]
            : never
    ) => Build;
}

interface ThreeDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 3
            ? [Dep<R, 0>, Dep<R, 1>, Dep<R, 2>]
            : never
    ) => Build;
}

interface TwoDepParams<R> {
    withDependencies: (
        ...dep: Length<ConstructorTypes<R>> extends 2
            ? [Dep<R, 0>, Dep<R, 1>]
            : never
    ) => Build;
}

interface OneDepParam<R> {
    withDependency: (dep: Dep<R, 0>) => Build;
}

interface Scope<R> {
    asASingleton: () => Length<ConstructorTypes<R>> extends 0
        ? ClassImplementation<R>
        : Dependency<R>;
}

type Typed<R> = R extends Ref<infer L> ? L : never;

interface ClassImplementation<R> extends Build {
    withImplementation: (implementation: Typed<R>) => Build;
}

interface StringRegisterType<R> {
    withImplementation: (parameter: ImplementationArg<R>) => Build;
    withDynamic: (parameter: Function) => Build;
}

type Dependency<R> = Length<ConstructorTypes<R>> extends 1
    ? OneDepParam<R>
    : Length<ConstructorTypes<R>> extends 2
    ? TwoDepParams<R>
    : Length<ConstructorTypes<R>> extends 3
    ? ThreeDepParams<R>
    : Length<ConstructorTypes<R>> extends 4
    ? FourDepParams<R>
    : Length<ConstructorTypes<R>> extends 5
    ? FiveDepParams<R>
    : Length<ConstructorTypes<R>> extends 6
    ? SixDepParams<R>
    : Length<ConstructorTypes<R>> extends 7
    ? SevenDepParams<R>
    : Scope<R>;

type Factory<R> = ConstructorTypes<R>[0] extends Resolver ? Build : never;
type ClassRegisterType<R> =
    | Factory<R>
    | (Dependency<R> & Scope<R> & ClassImplementation<R>);

export type RegisterType<R> = R extends string
    ? StringRegisterType<R>
    : ClassRegisterType<R>;
