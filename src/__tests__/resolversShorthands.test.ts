import { Bar, Foo } from "./fakeClasses";

import ObjectResolver from "../resolvers/ObjectResolver";
import RawValueResolver from "../resolvers/RawValueResolver";
import DIContainer from "../DIContainer";
import {
    diFactory,
    diFunc,
    diObject,
    diUse,
    diValue,
} from "../resolversShorthands";
import { DependencyResolver } from "../types";
import FactoryResolver from "../resolvers/FactoryResolver";

describe("definitionBuilders", () => {
    let container: DIContainer;
    beforeEach(() => {
        container = new DIContainer();
    });
    test("it resolves existing definition", () => {
        container.add({ key1: new RawValueResolver("value1") });
        const definition = diUse("key1");

        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it create value definition", () => {
        const definition = diValue("bar");
        expect(definition.resolve()).toEqual("bar");
    });

    test("it creates object of correct class", () => {
        const bar = new ObjectResolver(Bar);
        const definition = diObject(Foo).construct("a", bar);

        expect(definition).toBeInstanceOf(ObjectResolver);
        expect(definition.resolve(container)).toBeInstanceOf(Foo);
    });

    test("it names dependency using class name", () => {
        const definition = diObject(Foo);

        expect(definition).toBeInstanceOf(ObjectResolver);
    });

    test("it creates function definition", () => {
        function funcA(s: string) {
            return s;
        }
        const definition = diFunc(funcA, "abc");
        expect(definition.resolve(container)).toEqual("abc");
    });

    test("it creates function definition with shorthand function", () => {
        const definition = diFunc((s: string) => s, "abc");
        expect(definition.resolve(container)).toEqual("abc");
    });

    test("it creates factory definition", () => {
        const definition = diFactory(() => {
            return { a: 123 };
        });

        expect(definition.resolve(container)).toEqual({ a: 123 });
    });
});

describe("definitionBuilders respects typescript types", () => {
    let container: DIContainer;
    beforeEach(() => {
        container = new DIContainer();
    });

    test("diGet resolves type as scalar", () => {
        container.add({ key1: new RawValueResolver(22) });
        const definition: DependencyResolver<string> = diUse<string>("key1");
        expect(definition.resolve(container)).toEqual(22);
    });
    test("diGet resolves type as class object", () => {
        container.add({ key1: new RawValueResolver(new Bar()) });
        const definition: DependencyResolver<Bar> = diUse<Bar>("key1");
        expect(definition.resolve(container)).toBeInstanceOf(Bar);
    });
    test("diGet resolves type as class object based on Name", () => {
        container.add({ Bar: new Bar() });
        const definition: DependencyResolver<Bar> = diUse(Bar);
        expect(definition.resolve(container)).toBeInstanceOf(Bar);
    });
    test("diGet resolves type as function return type based on function name", () => {
        function customFunction() {
            return { b: 123 };
        }
        container.add({ customFunction: new FactoryResolver(customFunction) });
        const definition: DependencyResolver<{ b: number }> =
            diUse(customFunction);
        expect(definition.resolve(container)).toEqual({ b: 123 });
    });

    test("diValue 'resolve' returns scalar", () => {
        const definition = diValue(22);
        const bar: number = definition.resolve();
        expect(bar).toEqual(22);
    });

    test("diValue 'resolve' returns object class", () => {
        const definition = diValue(new Bar());
        const bar: Bar = definition.resolve();
        expect(bar).toBeInstanceOf(Bar);
    });

    test("diFunction 'resolve' returns function ReturnType", () => {
        const definition = diFunc((bar: Bar) => {
            return bar;
        }, new Bar());
        const resolvedBar = definition.resolve(container);
        expect(resolvedBar).toBeInstanceOf(Bar);
    });

    test("diFactory factory 'resolve' returns factory ReturnType as number", () => {
        const definition = diFactory(() => {
            return { a: 123 };
        });
        const resolved: { a: number } = definition.resolve(container);
        expect(resolved.a).toEqual(123);
    });
    test("diFactory factory 'resolve' returns factory ReturnType as class object", () => {
        const definition = diFactory(() => {
            return { bar: new Bar() };
        });
        const resolved: { bar: Bar } = definition.resolve(container);
        expect(resolved.bar).toBeInstanceOf(Bar);
    });

    test("diObject factory 'resolve' returns object of a given class", () => {
        const definition = diObject(Foo);
        const foo: Foo = definition.resolve(container);
        expect(foo).toBeInstanceOf(Foo);
    });
});
