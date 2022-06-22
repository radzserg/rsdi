import { Container } from "../Container";
import { build, buildSingleton, register } from "../builder/DependencyBuilder";

import { A, B, C, Foo, Bar } from "./fakeClasses";

describe("Container should", () => {
    afterEach(() => {
        Container.dispose();
    });

    describe("be singleton", () => {
        test("get the same instance", () => {
            expect(Container.instance).toBe(Container.instance);
        });
    });

    describe("get instances in different modes", () => {
        test("to be the correct instance of object resolved", () => {
            const dependencies = [buildSingleton(Foo, Bar)];

            Container.instance.register(dependencies);

            const foo = Container.instance.resolve(Foo);

            expect(foo).toBeInstanceOf(Foo);
        });

        test("resolve injected dependency as a singleton", () => {
            const dependencies = [buildSingleton(Foo, Bar)];

            Container.instance.register(dependencies);

            const foo1 = Container.instance.resolve(Foo);
            const foo2 = Container.instance.resolve(Foo);

            foo1.addItem("FAKE");

            expect(foo2.items[0]).toBe("FAKE");
        });

        test("resolve injected dependency for Bar as a transient and Foo as a Singleton", () => {
            const dependencies = [build(Bar), buildSingleton(Foo)];

            Container.instance.register(dependencies);

            const foo1 = Container.instance.resolve(Foo);
            const foo2 = Container.instance.resolve(Foo);

            expect(foo1).toBe(foo2);

            const bar1 = Container.instance.resolve(Bar);
            const bar2 = Container.instance.resolve(Bar);

            expect(bar1).not.toBe(bar2);
        });
    });

    describe("get instances by name", () => {
        test("register dependency by name and resolve by the same name", () => {
            const bar = new Bar();

            Container.instance.registerInstance("BAR", bar);

            expect(Container.instance.resolveByName("BAR")).toBe(bar);
        });
    });

    describe("get instances with tree level of dependencies", () => {
        test("resolve instance of class A when depends of B and C", () => {
            const dependencies = [
                register(B).withDependency(C).build(),
                register(A).withDependency(B).build(),
            ];

            Container.instance.register(dependencies);

            expect(Container.instance.resolve(A)).toBeDefined();
        });

        test("resolve instance of class A when depends of B and C and de sum method is resolved by C", () => {
            const dependencies = [
                register(B).withDependency(C).build(),
                register(A).withDependency(B).build(),
            ];

            Container.instance.register(dependencies);

            const a = Container.instance.resolve(A);

            expect(a.sum(1, 2)).toBe(3);
        });

        test("return the value saved by singleton instance of class C", () => {
            const dependencies = [
                register(C).asASingleton().build(),
                register(B).withDependency(C).build(),
                register(A).withDependency(B).build(),
            ];

            Container.instance.register(dependencies);

            const b = Container.instance.resolve(B);
            b.add("fake");

            expect(Container.instance.resolve(C)).toBe(
                Container.instance.resolve(C)
            );
            expect(b.get()).toBe(Container.instance.resolve(B).get());
            expect(b.get()).toBe(Container.instance.resolve(C).get());
        });

        test("return different values when C is not a singleton", () => {
            const dependencies = [
                register(C).build(),
                register(B).withDependency(C).build(),
                register(A).withDependency(B).build(),
            ];

            Container.instance.register(dependencies);

            const b = Container.instance.resolve(B);
            b.add("fake");

            expect(Container.instance.resolve(C)).not.toBe(
                Container.instance.resolve(C)
            );
            expect(b.get()).not.toBe(Container.instance.resolve(B).get());
            expect(b.get()).not.toBe(Container.instance.resolve(C).get());
        });
    });
});
