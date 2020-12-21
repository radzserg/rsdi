import { Container } from "Container";
import { build, buildSingleton } from "collaborators/DependencyBuilder";
import DependencyIsAlreadyDeclared from "errors/DependencyIsAlreadyDeclared";

import { Bar, Foo } from "./fakeClasses";

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

        test("throw error when user declare twice times the same dependency", () => {
            try {
                const dependencies = [build(Bar), buildSingleton(Foo, Bar)]; //is duplicated here

                Container.instance.register(dependencies);
            } catch (error) {
                expect(error).toBeInstanceOf(DependencyIsAlreadyDeclared);
            }
        });
    });

    describe("get instances by name", ()=> {
        test("register dependency by name and resolve by the same name", ()=> {
            const bar = new Bar();

            Container.instance.registerInstance("BAR", bar);

            expect(Container.instance.resolveByName("BAR")).toBe(bar);
        });
    })
});
