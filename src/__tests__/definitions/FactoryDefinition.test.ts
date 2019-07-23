import FactoryDefinition from "../../definitions/FactoryDefinition";
import DIContainer from "../../";
import ValueDefinition from "../../definitions/ValueDefinition";

describe("FactoryDefinition", () => {
    test("it invokes simple factory and resolves value", () => {
        const definition = new FactoryDefinition(() => "Value");
        expect(definition).toBeInstanceOf(FactoryDefinition);
        expect(definition.resolve(new DIContainer())).toEqual("Value");
    });

    test("it resolves value using values from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new FactoryDefinition((container: DIContainer) => {
            return container.get("key1");
        });
        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it returns same object if singleton() has been declared", () => {
        const container = new DIContainer();
        const definition: any = new FactoryDefinition(() => {
            return {a: 123};
        });
        definition.singleton();
        const resolved1 = definition.resolve(container);
        expect(resolved1).toEqual({a: 123});
        resolved1.b = 3;

        const resolved2 = definition.resolve(container);
        expect(resolved2).toEqual({a: 123, b: 3});
    });

    test("it calls factory every time if singleton() has not been declared", () => {
        const container = new DIContainer();
        const definition: any = new FactoryDefinition(() => {
            return {a: 123};
        });
        definition.singleton();
        const resolved1 = definition.resolve(container);
        expect(resolved1).toEqual({a: 123});
        resolved1.b = 3;

        const resolved2 = definition.resolve(container);
        expect(resolved2).toEqual({a: 123, b: 3});
    });
});
