import ValueDefinition from "../../definitions/ValueDefinition";

describe("ValueDefinition", () => {
    test("it resolves value", () => {
        const definition = new ValueDefinition("ENV", "production");
        expect(definition.name()).toEqual("ENV");
        expect(definition.resolve()).toEqual("production");
    });
});
