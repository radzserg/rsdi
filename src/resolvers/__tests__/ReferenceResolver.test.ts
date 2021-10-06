import RawValueResolver from "../RawValueResolver";
import DIContainer from "../../DIContainer";
import ReferenceResolver from "../ReferenceResolver";

describe("ReferenceResolver", () => {
    test("it resolves existing value from container", () => {
        const container: DIContainer = new DIContainer();
        container.add({ key1: new RawValueResolver("value1") });
        const definition = new ReferenceResolver("key1");

        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it throw an error if definition does not exist", () => {
        const container = new DIContainer();
        const definition = new ReferenceResolver("key1");

        expect(() => {
            definition.resolve(container);
        }).toThrow("Dependency with name key1 is not defined");
    });
});
