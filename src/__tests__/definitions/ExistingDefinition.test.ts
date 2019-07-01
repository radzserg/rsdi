import ValueDefinition from "../../definitions/ValueDefinition";
import DIContainer from "../../DIContainer";
import ExistingDefinition from "../../definitions/ExistingDefinition";

describe("ExistingDefinition", () => {
    test("it resolves existing value from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new ExistingDefinition("key1");

        expect(definition.resolve(container)).toEqual("value1");
    });
});
