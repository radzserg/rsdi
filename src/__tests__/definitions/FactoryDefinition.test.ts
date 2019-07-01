import FactoryDefinition from "../../definitions/FactoryDefinition";
import DIContainer from "../../";
import ValueDefinition from "../../definitions/ValueDefinition";

describe("FactoryDefinition", () => {
    test("it invokes simple factory and resolves value", () => {
        const definition = new FactoryDefinition("Foo", () => "Value");
        expect(definition).toBeInstanceOf(FactoryDefinition);
        expect(definition.name()).toEqual("Foo");
        expect(definition.resolve(new DIContainer())).toEqual("Value");
    });

    test("it resolves value using values from container", () => {
        const container = new DIContainer();
        container.addDefinition(new ValueDefinition("key1", "value1"));
        const definition = new FactoryDefinition("Foo", (container: DIContainer) => {
            return container.get("key1");
        });
        expect(definition.resolve(container)).toEqual("value1");
    });
});
