import { Container } from "../Container";
import { build, buildSingleton } from "../collaborators/DependencyBuilder";
import { Bar, Foo } from "./fakeClasses";
import DependencyIsAlreadyDeclared from "../errors/DependencyIsAlreadyDeclared";

describe("Container should", () => {
    describe("be singleton", () => {
        beforeEach(() => {
            const dependencies = [build(Foo, Bar)];

            Container.instance.register(dependencies);
        });

        afterEach(() => {
            Container.dispose();
        });

        test("get the same instance", () => {
            expect(Container.instance).toBe(Container.instance);
        });

        test("resolve dependency", () => {
            const foo = Container.instance.resolve(Foo);

            expect(foo).toBeInstanceOf(Foo);
        });

        test("resolve injected dependency", () => {
            const bar = Container.instance.resolve(Bar);

            expect(bar).toBeInstanceOf(Bar);
        });

        test("resolve dependency as transient", () => {
            const foo1 = Container.instance.resolve(Foo);
            const foo2 = Container.instance.resolve(Foo);

            expect(foo1).not.toBe(foo2);
        });
    });

    describe("register with different modes", () => {
        afterEach(() => {
            Container.dispose();
        });

        test("resolve injected dependency as a singleton", () => {
            const dependencies = [buildSingleton(Foo, Bar)];

            Container.instance.register(dependencies);

            const foo1 = Container.instance.resolve(Foo);
            const foo2 = Container.instance.resolve(Foo);

            foo1.addItem("FAKE");

            expect(foo2.items[0]).toBe("FAKE");
        });

        test("resolve injected dependency for Foo as a transient", () => {
            const dependencies = [build(Bar), buildSingleton(Foo)];

            Container.instance.register(dependencies);

            const foo1 = Container.instance.resolve(Foo);
            const foo2 = Container.instance.resolve(Foo);

            expect(foo1).toBe(foo2);

            const bar1 = Container.instance.resolve(Bar);
            const bar2 = Container.instance.resolve(Bar);

            expect(bar1).not.toBe(bar2);
        });

        test("throw error when user declare twice times the same dependency", () => {
            try {
                const dependencies = [build(Bar), buildSingleton(Foo, Bar)]; //is duplicated here

                Container.instance.register(dependencies);
            } catch (error) {
                expect(error).toBeInstanceOf(DependencyIsAlreadyDeclared);
            }
        });
    });
});
