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
});
