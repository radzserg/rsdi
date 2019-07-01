import ObjectDefinition from "../../definitions/ObjectDefinition";
import { Bar, Foo } from "../fakeClasses";
import ConstructorArgumentError from "../../errors/ConstructorArgumentError";
import DIContainer from "../../";

describe("ObjectDefinition", () => {
    const container = new DIContainer();
    test("it throws an error if constructor arguments are not provided", () => {
        expect(() => {
            new ObjectDefinition(Foo).construct("a");
        }).toThrow(new ConstructorArgumentError(2));
    });

    test("it creates object of correct class and initiate constructor with deps", () => {
        const fakeName = "My name is Foo";
        const bar = new ObjectDefinition(Bar);
        const definition = new ObjectDefinition(Foo).construct(fakeName, bar);
        const instance = definition.resolve<Foo>(container);
        expect(instance).toBeInstanceOf(Foo);
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
        expect(instance.service.buzz()).toEqual("buzz");
    });
});
