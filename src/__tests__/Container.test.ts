import { Container } from "../Container";
import { register } from "../DependencyBuilder";

import { A, B, C, ClassWithInterfaceDependency, InterfaceImplementation } from "./fakeClasses";

describe("Container should", () => {
    afterEach(() => {
        Container.dispose();
    });

    test("Register class as a singleton", () => {
        const dependencies = [
            register(C).asASingleton().build(),
        ];

        Container.register(dependencies);

        const c1 = Container.resolve(C);
        const c2 = Container.resolve(C);

        expect(c1).toBe(c2);
    })

    test("Sum with class A with dependency injection", () => {
        const dependencies = [
            register(C).build(),
            register(B).withDependency(C).build(),
            register(A).withDependency(B).build(),
        ];

        Container.register(dependencies);

        const a = Container.resolve(A);

        expect(a.sum(1, 2)).toBe(3);
    })

    test("With class implementation", () => {
        class Implementation {
            hi() {
                return "HI"
            }
        }

        Container.register([
            register("test").withImplementation(new Implementation()).build()
        ])

        const resolved = Container.resolve<Implementation>("test");

        expect(resolved.hi()).toBe("HI")
    })

    test("With object implementation", () => {
        const implementation = {
            hi: () => {
                return "HI"
            }
        }

        Container.register([
            register("test").withImplementation(implementation).build()
        ])

        const resolved = Container.resolve<typeof implementation>("test");

        expect(resolved.hi()).toBe("HI")
    })

    test("With dynamic value", () => {
        const dynamicHook = () => "HI";

        Container.register([
            register("test").withDynamic(() => dynamicHook()).build()
        ])

        const resolved = Container.resolve("test");

        expect(resolved).toBe("HI")
    })

    test("Resolve interface dependency", () => {
        Container.register([
            register("Interface").withImplementation(InterfaceImplementation).build(),
            register(ClassWithInterfaceDependency).withDependency("Interface").build(),
        ]);

        const resolved = Container.resolve(ClassWithInterfaceDependency);

        expect(resolved.doSomething()).toBe("HI")
    })

    test("Resolve interface dependency other way", () => {
        Container.register([
            register(ClassWithInterfaceDependency).withDependency(InterfaceImplementation).build(),
        ]);

        const resolved = Container.resolve(ClassWithInterfaceDependency);

        expect(resolved.doSomething()).toBe("HI")
    })
});
