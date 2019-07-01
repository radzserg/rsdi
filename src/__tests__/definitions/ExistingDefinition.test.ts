import ValueDefinition from "../../definitions/ValueDefinition";
import DIContainer from "../../DIContainer";
import ExistingDefinition from "../../definitions/ExistingDefinition";

describe("ExistingDefinition", () => {
    test("it resolves existing value from container", () => {
        const container = new DIContainer();
        container.addDefinition(new ValueDefinition("key1", "value1"));
        const definition = new ExistingDefinition("key2", "key1");

        expect(definition.name()).toEqual("key2");
        expect(definition.resolve(container)).toEqual("value1");
    });
});
