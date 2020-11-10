import { Container } from "../Container";
import { build } from "../collaborators/DependencyBuilder";
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

    it("resolve injected dependency as a singleton", () => {
        const bar1 = Container.instance.resolve(Bar);
        const bar2 = Container.instance.resolve(Bar);

        expect(bar1).toBe(bar2);
    });
});
