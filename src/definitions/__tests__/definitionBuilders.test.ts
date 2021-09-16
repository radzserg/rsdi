import { Bar, Foo } from "../../__tests__/fakeClasses";

import ObjectDefinition from "../ObjectDefinition";
import ValueDefinition from "../ValueDefinition";
import DIContainer, { IDIContainer } from "../../DIContainer";
import { diFactory, diGet, diObject, diValue } from "../definitionBuilders";
import { IDefinition } from "../IDefinition";

describe("definitionBuilders", () => {
    let container: DIContainer;
    beforeEach(() => {
        container = new DIContainer();
    });
    test("it resolves existing definition", () => {
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = diGet("key1");

        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it create value definition", () => {
        const definition = diValue("bar");
        expect(definition.resolve()).toEqual("bar");
    });

    test("it creates object of correct class", () => {
        const bar = new ObjectDefinition(Bar);
        const definition = diObject(Foo).construct("a", bar);

        expect(definition).toBeInstanceOf(ObjectDefinition);
        expect(definition.resolve(container)).toBeInstanceOf(Foo);
    });

    test("it names dependency using class name", () => {
        const definition = diObject(Foo);

        expect(definition).toBeInstanceOf(ObjectDefinition);
    });

    test("it creates singleton factory definition", () => {
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

    test("diGet 'resolve' returns scalar", () => {
        container.addDefinition("key1", new ValueDefinition(22));
        const definition: IDefinition<string> = diGet<string>("key1");
        expect(definition.resolve(container)).toEqual(22);
    });
    test("diGet 'resolve' returns class object", () => {
        container.addDefinition("key1", new ValueDefinition(new Bar()));
        const definition: IDefinition<Bar> = diGet<Bar>("key1");
        expect(definition.resolve(container)).toBeInstanceOf(Bar);
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
});
