import DIContainer from "../container/DIContainer";
import ObjectDefinition from "../definitions/ObjectDefinition";
import ValueDefinition from "../definitions/ValueDefinition";
import DependencyIsMissingError from "../errors/DependencyIsMissingError";
import { factory, get, object } from "../definitions/definitionBuilders";

import { Foo } from "./fakeClasses";
import { Mode } from "../types";

describe("DIContainer", () => {
    test("it adds and resolves definitions", () => {
        const container = new DIContainer();
        const definitions = {
            foo: new ObjectDefinition(Foo),
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);
        const foo = container.get("foo");
        expect(foo).toBeInstanceOf(Foo);
        expect(container.get("key1")).toEqual("value1");
    });

    test("it throws an error if definition is missing during resolution", () => {
        const container = new DIContainer();
        expect(() => {
            container.get("Logger");
        }).toThrow(new DependencyIsMissingError("Logger"));
    });

    test("it always returns singleton", () => {
        const container = new DIContainer();
        const definitions = {
            foo: new ObjectDefinition(Foo, Mode.SINGLETON).construct("name1"),
        };
        container.addDefinitions(definitions);

        const foo = container.get<Foo>("foo");
        expect(foo.name).toEqual("name1");
        foo.name = "name2";
        const foo2 = container.get<Foo>("foo");
        expect(foo2.name).toEqual("name2");
    });

    test("it always returns transient", () => {
        const container = new DIContainer();
        const definitions = {
            foo: new ObjectDefinition(Foo).construct("name1"),
        };
        container.addDefinitions(definitions);

        const foo = container.get<Foo>("foo");
        expect(foo.name).toEqual("name1");
        foo.name = "name2";
        const foo2 = container.get<Foo>("foo");
        expect(foo2.name).not.toEqual("name2");
    });

    test("it adds definition to existing list", () => {
        const container = new DIContainer();
        const definitions = {
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);

        container.addDefinition("key2", new ValueDefinition("value2"));
        expect(container.get("key1")).toEqual("value1");
        expect(container.get("key2")).toEqual("value2");
    });

    test("it adds definitions to existing list", () => {
        const container = new DIContainer();
        const definitions = {
            key1: new ValueDefinition("value1"),
        };
        container.addDefinitions(definitions);

        container.addDefinitions({
            key2: new ValueDefinition("value2"),
            key3: new ValueDefinition("value3"),
        });
        expect(container.get("key1")).toEqual("value1");
        expect(container.get("key2")).toEqual("value2");
        expect(container.get("key3")).toEqual("value3");
    });

    test("if value not an instance of BaseDefinition treat it as ValueDefinition", () => {
        const container = new DIContainer();
        const definitions = {
            key1: "value1",
        };
        container.addDefinitions(definitions);
        expect(container.get("key1")).toEqual("value1");
        container.addDefinition("key2", "value2");
        expect(container.get("key2")).toEqual("value2");
    });

    test("it resolves factory returning pending Promise", async () => {
        class TestUserRepository {
            private dbConnection: any;
            public constructor(private readonly dbConnectionPromise: any) {}
            async init() {
                this.dbConnection = await this.dbConnectionPromise;
            }
            async findUser() {
                await this.init();
                const dbConnection = this.dbConnection;
                return await new Promise((resolve) =>
                    setTimeout(() => {
                        resolve(`${dbConnection} + findUser`);
                    })
                );
            }
        }

        const container = new DIContainer();
        container.addDefinition("dsn", new ValueDefinition("DSN-secret"));
        container.addDefinition(
            "dbConnection",
            factory((container) => {
                return new Promise((resolve) =>
                    setTimeout(() => {
                        resolve(container.resolve("dsn"));
                    })
                );
            })
        );
        container.addDefinition(
            "TestUserRepository",
            object(TestUserRepository).construct(get("dbConnection"))
        );

        const userRepository =
            container.get<TestUserRepository>("TestUserRepository");
        expect(await userRepository.findUser()).toBe("DSN-secret + findUser");
    });

    test("it can detect simple circular dependencies", () => {
        class Foo {
            constructor(public bar: Bar) {}
        }
        class Bar {
            constructor(public foo: Foo) {}
        }

        const container = new DIContainer();
        container.addDefinitions({
            foo: new ObjectDefinition(Foo).construct(get("bar")),
            bar: new ObjectDefinition(Bar).construct(get("foo")),
        });
        expect(() => {
            container.get("foo");
        }).toThrow(
            'Circular Dependency is detected. Dependency: "foo", path: foo -> bar'
        );
    });

    test("it can detect deep circular dependencies", () => {
        class Foo {
            constructor(public bar: Bar) {}
        }
        class Bar {
            constructor(public buzz: Buzz) {}
        }
        class Buzz {
            constructor(public foo: Foo) {}
        }

        const container = new DIContainer();
        container.addDefinitions({
            foo: new ObjectDefinition(Foo).construct(get("bar")),
            bar: new ObjectDefinition(Bar).construct(get("buzz")),
            buzz: new ObjectDefinition(Buzz).construct(get("foo")),
        });
        expect(() => {
            container.get("foo");
        }).toThrowError(
            'Circular Dependency is detected. Dependency: "foo", path: foo -> bar -> buzz.'
        );
    });
});
