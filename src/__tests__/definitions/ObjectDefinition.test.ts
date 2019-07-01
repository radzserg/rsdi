import ObjectDefinition from "definitions/ObjectDefinition";
import { Bar, Foo } from "__tests__/fakeClasses";

describe("ObjectDefinition", () => {
    test("it creates object of correct class", () => {
        const definition = new ObjectDefinition("Foo", Foo);
        const instance = definition.resolve<Foo>();
        expect(instance).toBeInstanceOf(Foo);
    });

    test("it passes constructor params", () => {
        const fakeName = "My name is Foo";
        const definition = new ObjectDefinition("Foo", Foo, fakeName);
        const instance = definition.resolve<Foo>();
        expect(instance).toBeInstanceOf(Foo);
        expect(instance.name).toEqual(fakeName);
    });

    test("it resolves Definition params passed in constructor", () => {
        const fakeName = "My name is Foo";
        const BarDefinition = new ObjectDefinition("Bar", Bar);
        const definition = new ObjectDefinition(
            "Foo",
            Foo,
            fakeName,
            BarDefinition
        );
        const instance = definition.resolve<Foo>();
        expect(instance).toBeInstanceOf(Foo);
        expect(instance.name).toEqual(fakeName);
        expect(instance.service.buzz()).toEqual("buzz");
    });
});
