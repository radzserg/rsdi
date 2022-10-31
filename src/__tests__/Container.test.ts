import { Container } from "../Container";
import { build, buildSingleton, register } from "../DependencyBuilder";

import { A, B, C, Foo, Bar } from "./fakeClasses";

describe("Container should", () => {
    afterEach(() => {
        Container.dispose();
    });

    test("Sum with class C", () => {
        const c = new C();

        expect(c.sum(1, 2)).toBe(3);
    });

    test("Sum with class B", () => {
        const c = new C();
        const b = new B(c);

        expect(b.sum(1, 2)).toBe(3);
    });

    test("Sum with class A", () => {
        const c = new C();
        const b = new B(c);
        const a = new A(b);

        expect(a.sum(1, 2)).toBe(3);
    })


    test("Sum with class A with dependency injection", () => {
        const dependencies = [
            register(C).build(),
            register(B).withDependency(C).build(),
            register(A).withDependency(B).build(),
        ];

        Container.instance.register(dependencies);

        const a = Container.instance.resolve(A);

        expect(a.sum(1, 2)).toBe(3);
    })

    test("With implementation value", () => {
        const func = () => "HI";

        Container.instance.register([
            register("test").withImplementation(func()).build()
        ])

        const resolved = Container.instance.resolve("test");

        expect(resolved).toBe("HI")
    })

    test("With dynamic value", () => {
        const func = () => "HI";

        Container.instance.register([
            register("test").withDynamicValue(() => func()).build()
        ])

        const resolved = Container.instance.resolve("test");

        expect(resolved).toBe("HI")
    })
});
