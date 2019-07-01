import { Foo } from "./fakeClasses";
import DIContainer from "../DIContainer";
import ObjectDefinition from "../definitions/ObjectDefinition";

describe("DIContainer", () => {
    test("it adds definitions", () => {
        const container = new DIContainer();
        const definitions = {
            "Foo": new ObjectDefinition( Foo)
        };
        container.addDefinitions(definitions);
        const foo = container.get("Foo");
        expect(foo).toBeInstanceOf(Foo);
    });
});
