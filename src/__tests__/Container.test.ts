import { Container } from "../Container";
import { build, buildSingleton } from "../collaborators/DependencyBuilder";
import { Bar, Foo } from "./fakeClasses";

describe("Container should", () => {
    beforeEach(() => {
        const dependencies = [build(Foo, Bar)];

        Container.instance.register(dependencies);
    });

    it("get the same instance", () => {
        expect(Container.instance).toBe(Container.instance);
    });

    it("resolve dependency", () => {
        const foo = Container.instance.resolve(Foo);

        expect(foo).toBeInstanceOf(Foo);
    });

    it("resolve injected dependency", () => {
        const bar = Container.instance.resolve(Bar);

        expect(bar).toBeInstanceOf(Bar);
    });

    it("resolve dependency as transient", ()=> {
        const foo1 = Container.instance.resolve(Foo);
        const foo2 = Container.instance.resolve(Foo);

        expect(foo1).not.toBe(foo2);
    });

    it("resolve injected dependency as a singleton", () => {
        const dependencies = [buildSingleton(Foo, Bar)];

        Container.instance.register(dependencies);
        
        const foo1 = Container.instance.resolve(Foo);
        const foo2 = Container.instance.resolve(Foo);

        foo1.addItem("FAKE");

        expect(foo2.items[0]).toBe("FAKE");
    });
});
