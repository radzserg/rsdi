import ValueDefinition from "../ValueDefinition";
import DIContainer from "../../DIContainer";
import ExistingDefinition from "../ExistingDefinition";

describe("ExistingDefinition", () => {
    test("it resolves existing value from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new ExistingDefinition("key1");

        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it throw an error if definition does not exist", () => {
        const container = new DIContainer();
        const definition = new ExistingDefinition("key1");

        expect(() => {
            definition.resolve(container);
        }).toThrow("Dependency with name key1 is not defined");
    });
});
