import ValueDefinition from "../ValueDefinition";

describe("ValueDefinition", () => {
    test("it resolves value", () => {
        const definition = new ValueDefinition("production");
        expect(definition.resolve()).toEqual("production");
    });
});

describe("it respects TS types", function() {
    test("infer types", () => {
        const definition = new ValueDefinition<string>("production");
        let s: string = definition.resolve();
        expect(s).toEqual("production");
    });

    test("it uses constructor type", () => {
        const definition = new ValueDefinition<string>("production");
        let s: string = definition.resolve();
        expect(s).toEqual("production");
    });

    test("it respects resolve type parameter", () => {
        const definition = new ValueDefinition(123);
        let n: number = definition.resolve<number>();
        expect(n).toEqual(123);
    });
});
