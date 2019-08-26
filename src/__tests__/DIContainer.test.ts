import { Foo } from "./fakeClasses";
import DIContainer from "../DIContainer";
import ObjectDefinition from "../definitions/ObjectDefinition";
import ValueDefinition from "../definitions/ValueDefinition";
import DependencyIsMissingError from "../errors/DependencyIsMissingError";

describe("DIContainer", () => {
    test("it adds and resolves definitions", () => {
        const container = new DIContainer();
        const definitions = {
            foo: new ObjectDefinition(Foo),
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);
        const foo = container.get("foo");
        expect(foo).toBeInstanceOf(Foo);
        expect(container.get("key1")).toEqual("value1");
    });

    test("it throws an error if definition is missing during resolution", () => {
        const container = new DIContainer();
        expect(() => {
            container.get("Logger");
        }).toThrow(new DependencyIsMissingError("Logger"));
    });

    test("it always returns singleton", () => {
        const container = new DIContainer();
        const definitions = {
            foo: new ObjectDefinition(Foo).construct("name1", undefined)
        };
        container.addDefinitions(definitions);

        const foo = container.get<Foo>("foo");
        expect(foo.name).toEqual("name1");
        foo.name = "name2";
        const foo2 = container.get<Foo>("foo");
        expect(foo2.name).toEqual("name2");
    });

    test("it adds definition to existing list", () => {
        const container = new DIContainer();
        const definitions = {
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);

        container.addDefinition("key2", new ValueDefinition("value2"));
        expect(container.get("key1")).toEqual("value1");
        expect(container.get("key2")).toEqual("value2");
    });

    test("it adds definitions to existing list", () => {
        const container = new DIContainer();
        const definitions = {
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);

        container.addDefinitions({
            key2: new ValueDefinition("value2"),
            key3: new ValueDefinition("value3"),
        });
        expect(container.get("key1")).toEqual("value1");
        expect(container.get("key2")).toEqual("value2");
        expect(container.get("key3")).toEqual("value3");
    });

    test("if value not an instance of BaseDefinition treat it as ValueDefinition", () => {
        const container = new DIContainer();
        const definitions = {
            key1: "value1",
        };
        container.addDefinitions(definitions);
        expect(container.get("key1")).toEqual("value1");
        container.addDefinition("key2", "value2");
        expect(container.get("key2")).toEqual("value2");
    })
});
