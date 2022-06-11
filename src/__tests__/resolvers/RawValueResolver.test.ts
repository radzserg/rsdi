import RawValueResolver from "../../resolvers/RawValueResolver";

describe(RawValueResolver.name, () => {
  test("it resolves value", () => {
    const definition = new RawValueResolver("production");
    expect(definition.resolve()).toEqual("production");
  });

  describe("it respects TS types", function () {
    test("infer string type", () => {
      const definition = new RawValueResolver("production");
      const s: string = definition.resolve();
      expect(s).toEqual("production");
    });

    test("infer number type", () => {
      const definition = new RawValueResolver(123);
      const s: number = definition.resolve();
      expect(s).toEqual(123);
    });

    test("it uses constructor type", () => {
      const definition = new RawValueResolver<string>("production");
      const s: string = definition.resolve();
      expect(s).toEqual("production");
    });

    test("it respects resolve type parameter", () => {
      const definition = new RawValueResolver(123);
      const n: number = definition.resolve();
      expect(n).toEqual(123);
    });
  });
});
