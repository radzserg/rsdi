import {Bar, Foo} from "../fakeClasses";
import { diObject } from "definitions/definitionBuilders";
import ObjectDefinition from "definitions/ObjectDefinition";

describe("definitionBuilders", () => {
    test("it creates object of correct class", () => {
        const bar = new ObjectDefinition("Bar", Bar);
        const definition = diObject(Foo, "Foo").construct("a", bar);

        expect(definition).toBeInstanceOf(ObjectDefinition);
        expect(definition.name()).toEqual("Foo");
        const foo = definition.resolve();
        expect(foo).toBeInstanceOf(Foo);
    });

    test("it names dependency using class name", () => {
        const definition = diObject(Foo);
        expect(definition).toBeInstanceOf(ObjectDefinition);
        expect(definition.name()).toEqual("Foo");
    });
});
