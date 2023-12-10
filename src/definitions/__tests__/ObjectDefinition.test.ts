import ObjectDefinition from "../ObjectDefinition";
import MethodIsMissingError from "../../errors/MethodIsMissingError";
import InvalidConstructorError from "../../errors/InvalidConstructorError";
import DIContainer from "../../container/DIContainer";
import { get } from "../../definitions/definitionBuilders";

import { Bar, Buzz, Foo, FooChild } from "../../__tests__/fakeClasses";

describe("ObjectDefinition", () => {
    const container = new DIContainer();
    test("it creates object of correct class and initiate constructor with deps", () => {
        const fakeName = "My name is Foo";
        const bar = new ObjectDefinition(Bar);
        const definition = new ObjectDefinition(Foo).construct(fakeName, bar);
        const instance = definition.resolve<Foo>(container);
        expect(instance).toBeInstanceOf(Foo);
        expect(instance.name).toEqual(fakeName);
    });

    test("it can initiate child constructors", () => {
        const fakeName = "My name is FooChild";
        const bar = new ObjectDefinition(Bar);
        const definition = new ObjectDefinition(FooChild).construct(
            fakeName,
            bar
        );
        const instance = definition.resolve<Foo>(container);
        expect(instance).toBeInstanceOf(FooChild);
        expect(instance.name).toEqual(fakeName);
    });

    test("it resolves Definition params passed in constructor", () => {
        const fakeName = "My name is Foo";
        const BarDefinition = new ObjectDefinition(Bar);
        const definition = new ObjectDefinition(Foo).construct(
            fakeName,
            BarDefinition
        );
        const instance = definition.resolve<Foo>(container);
        expect(instance).toBeInstanceOf(Foo);
        expect(instance.name).toEqual(fakeName);
        expect(instance.service.bar()).toEqual("bar");
    });

    test("it calls methods after object have been initiated", () => {
        const definition = new ObjectDefinition(Foo)
            .method("addItem", "item1")
            .method("addItem", "item2");
        const instance = definition.resolve<Foo>(container);
        expect(instance).toBeInstanceOf(Foo);
        expect(instance.items).toEqual(["item1", "item2"]);
    });

    test("it throws an error if method does not exist", () => {
        const definition = new ObjectDefinition(Foo).method(
            "undefinedMethod",
            "item1"
        );
        expect(() => {
            definition.resolve<Foo>(container);
        }).toThrow(new MethodIsMissingError("Foo", "undefinedMethod"));
    });

    test.each([[undefined], [() => {}], ["abc"]])(
        "it throws an error if invalid constructor have been provided",
        () => {
            expect((constructorFunction: any) => {
                new ObjectDefinition(constructorFunction);
            }).toThrow(new InvalidConstructorError());
        }
    );

    test("it resolves deps while calling method", () => {
        container.addDefinition("key1", "value1");
        const definition = new ObjectDefinition(Foo).method(
            "addItem",
            get("key1")
        );
        const instance = definition.resolve<Foo>(container);
        expect(instance.items).toEqual(["value1"]);
    });

    test("it resolves a class without explicit controller", () => {
        const definition = new ObjectDefinition(Buzz);
        const instance = definition.resolve<Buzz>(container);
        expect(instance).toBeInstanceOf(Buzz);
    });
});
