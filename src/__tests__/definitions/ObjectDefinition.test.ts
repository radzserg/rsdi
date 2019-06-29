import ObjectDefinition from "definitions/ObjectDefinition";

class Foo {
    private a: string;
    constructor(a: string) {
        this.a = a;
    }
}

describe("ObjectDefinition",  () => {

    test("it should return value based on its type", () => {
        const definition = new ObjectDefinition("Foo", Foo);
        const instance = definition.resolve();
        expect(instance).toBeInstanceOf(Foo);
        console.log(instance)
    });
});