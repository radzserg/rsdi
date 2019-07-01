import ObjectDefinition from "definitions/ObjectDefinition";
import { Foo } from "../fakeClasses";
import { create } from "definitions/definitionBuilders";

describe("definitionBuilders", () => {
    test("it creates object of correct class", () => {
        const definition = create(Foo, "Foo", "a");
        console.log("test\n", definition);
    });
});
