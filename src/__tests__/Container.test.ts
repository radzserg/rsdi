import { Container } from "../Container";
import { register } from "../DependencyBuilder";

import {
    A,
    B,
    C,
    ClassWithInterfaceDependency,
    Root,
    InnerDep,
    InnerRoot,
    InnerRootB,
    InterfaceImplementation,
    Bar,
    Buzz,
    FactoryImplementation,
} from "./fakeClasses";

describe("Container should", () => {
    afterEach(() => {
        Container.dispose();
    });

    test("Register class as a singleton", () => {
        const dependencies = [register(C).asASingleton().build()];

        Container.register(dependencies);

        const c1 = Container.resolve(C);
        const c2 = Container.resolve(C);

        expect(c1).toBe(c2);
    });

    test("Sum with class A with dependency injection", () => {
        const dependencies = [
            register(C).build(),
            register(B).withDependency(C).build(),
            register(A).withDependency(B).build(),
        ];

        Container.register(dependencies);

        const a = Container.resolve(A);

        expect(a.sum(1, 2)).toBe(3);
    });

    test("With class implementation", () => {
        class Implementation {
            hi() {
                return "HI";
            }
        }

        Container.register([
            register("test").withImplementation(new Implementation()).build(),
        ]);

        const resolved = Container.resolve<Implementation>("test");

        expect(resolved.hi()).toBe("HI");
    });

    test("With object implementation", () => {
        const implementation = {
            hi: () => {
                return "HI";
            },
        };

        Container.register([
            register("test").withImplementation(implementation).build(),
        ]);

        const resolved = Container.resolve<typeof implementation>("test");

        expect(resolved.hi()).toBe("HI");
    });

    test("With dynamic value", () => {
        const dynamicHook = () => "HI";

        Container.register([
            register("test")
                .withDynamic(() => dynamicHook())
                .build(),
        ]);

        const resolved = Container.resolve("test");

        expect(resolved).toBe("HI");
    });

    test("Resolve interface dependency", () => {
        Container.register([
            register("Interface")
                .withImplementation(InterfaceImplementation)
                .build(),
            register(ClassWithInterfaceDependency)
                .withDependency("Interface")
                .build(),
        ]);

        const resolved = Container.resolve(ClassWithInterfaceDependency);

        expect(resolved.doSomething()).toBe("HI");
    });

    test("Resolve interface dependency other way", () => {
        Container.register([
            register(ClassWithInterfaceDependency)
                .withDependency(InterfaceImplementation)
                .build(),
        ]);

        const resolved = Container.resolve(ClassWithInterfaceDependency);

        expect(resolved.doSomething()).toBe("HI");
    });

    test("Resolve function as implementation", () => {
        const FooFunction = () => "HI";

        Container.register([
            register("Foo").withImplementation(FooFunction).build(),
        ]);

        const resolved = Container.resolve<typeof FooFunction>("Foo");

        expect(resolved).toBe(FooFunction);
        expect(resolved()).toBe("HI");
    });

    test("Register with specific function as a dependency", () => {
        const Implementation = () => {
            return {
                doSomething(): string {
                    return "HI";
                },
            };
        };

        Container.register([
            register(ClassWithInterfaceDependency)
                .withDependency(Implementation)
                .build(),
        ]);

        const resolved = Container.resolve(ClassWithInterfaceDependency);

        expect(resolved).toBeInstanceOf(ClassWithInterfaceDependency);
        expect(resolved.doSomething()).toBe("HI");
    });

    test("Resolve root instance with all repeated dependency", () => {
        Container.register([
            register(InnerRoot).withDependency(InnerDep).build(),
            register(InnerRootB).withDependency(InnerDep).build(),
            register(Root).withDependencies(InnerRoot, InnerRootB).build(),
        ]);

        const resolved = Container.resolve(Root);

        expect(resolved).toBeInstanceOf(Root);
    });

    test("Resolve root instance with all repeated dependency singleton", () => {
        Container.register([
            register(InnerDep).asASingleton().build(),
            register(InnerRoot).withDependency(InnerDep).build(),
            register(InnerRootB).withDependency(InnerDep).build(),
            register(Root).withDependencies(InnerRoot, InnerRootB).build(),
        ]);

        const resolved = Container.resolve(Root);

        expect(resolved.innerA.inner).toBeInstanceOf(InnerDep);

        const resolved2 = Container.resolve(Root);

        expect(resolved.innerA.inner).toBe(resolved2.innerA.inner);
    });

    test("Resolve root instance with all repeated no singleton dependency", () => {
        Container.register([
            register(InnerRoot).withDependency(InnerDep).build(),
            register(InnerRootB).withDependency(InnerDep).build(),
            register(Root).withDependencies(InnerRoot, InnerRootB).build(),
        ]);

        const resolved = Container.resolve(Root);

        expect(resolved.innerA.inner).toBeInstanceOf(InnerDep);

        const resolved2 = Container.resolve(Root);

        expect(resolved.innerA.inner).not.toBe(resolved2.innerA.inner);
    });

    test("Resolve as a factory dependency", () => {
        Container.register([
            register(Bar).build(),
            register(Buzz).build(),
            register(FactoryImplementation).build(),
        ]);

        const resolved = Container.resolve(FactoryImplementation);

        expect(resolved.create("Bar")).toBeInstanceOf(Bar);
        expect(resolved.create("Buzz")).toBeInstanceOf(Buzz);
    });
});
