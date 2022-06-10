import { Bar, Foo } from "./fakeClasses";
import DIContainer from "../DIContainer";
import ObjectResolver from "../resolvers/ObjectResolver";
import RawValueResolver from "../resolvers/RawValueResolver";
import { factory, func, IDIContainer, object, use } from "../index";
import { DependencyIsMissingError } from "../errors";

describe("DIContainer adds resolvers", () => {
  test("it uses use inside add", () => {
    const container: DIContainer = new DIContainer();

    container.add({
      bar: new ObjectResolver(Bar),
      key1: new RawValueResolver("value1"),
    });
    container.add({
      foo: new ObjectResolver(Foo).construct("foo", container.use("bar")),
    });
    const foo = container.get("foo");
    expect(foo).toBeInstanceOf(Foo);
  });

  test("it adds and resolves resolvers", () => {
    const container: DIContainer = new DIContainer();
    const resolvers = {
      foo: new ObjectResolver(Foo).construct("foo", new Bar()),
      key1: new RawValueResolver("value1"),
    };
    container.add(resolvers);
    const foo = container.get("foo");
    expect(foo).toBeInstanceOf(Foo);
    expect(container.get("key1")).toEqual("value1");
  });

  test("it add func resolver", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      a: "a",
      b: "b",
      concat: func(
        function (a: string, b: string) {
          return a + b;
        },
        use("a"),
        use("b")
      ),
    });

    const concat = container.get("concat");
    expect(concat).toEqual("ab");
  });

  test("it adds resolver to existing list", () => {
    const container: DIContainer = new DIContainer();
    const resolvers = {
      key1: new RawValueResolver("value1"),
    };
    container.add(resolvers);

    container.add({ key2: new RawValueResolver("value2") });
    expect(container.get("key1")).toEqual("value1");
    expect(container.get("key2")).toEqual("value2");
  });

  test("it adds resolvers to existing list", () => {
    const container: DIContainer = new DIContainer();
    const resolvers = {
      key1: new RawValueResolver("value1"),
    };
    container.add(resolvers);

    container.add({
      key2: new RawValueResolver("value2"),
      key3: new RawValueResolver("value3"),
    });
    expect(container.get("key1")).toEqual("value1");
    expect(container.get("key2")).toEqual("value2");
    expect(container.get("key3")).toEqual("value3");
  });

  test("if value not an instance of BaseDefinition treat it as ValueDefinition", () => {
    const container: DIContainer = new DIContainer();
    const resolvers = {
      key1: "value1",
    };
    container.add(resolvers);
    expect(container.get("key1")).toEqual("value1");
    container.add({ key2: "value2" });
    expect(container.get("key2")).toEqual("value2");
  });

  test("if can use container .get function", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      bar: object(Bar),
    });
    container.add({
      foo: object(Foo).construct("bla", container.get("bar")),
    });
    expect(container.get("foo")).toBeInstanceOf(Foo);
  });
});

describe("DIContainer resolution", () => {
  test("it allows to override resolvers by key", () => {
    const container: DIContainer = new DIContainer();
    container.add({ key1: "key1" });
    container.add({ key1: "key2" });
    const value = container.get("key1");
    expect(value).toEqual("key2");
  });

  test("it throws an error if definition is missing during resolution", () => {
    const container: DIContainer = new DIContainer();
    expect(() => {
      // @ts-ignore
      container.get("Logger");
    }).toThrow(new DependencyIsMissingError("Logger"));
  });

  test("it always returns singleton", () => {
    const container: DIContainer = new DIContainer();
    const resolvers = {
      foo: new ObjectResolver(Foo).construct("name1", new Bar()),
    };
    container.add(resolvers);

    const foo = container.get("foo");
    expect(foo.name).toEqual("name1");
    foo.name = "name2";
    const foo2 = container.get("foo");
    expect(foo2.name).toEqual("name2");
  });
});

describe("DIContainer circular dependencies detection", () => {
  test("it can detect simple circular dependencies", () => {
    class Foo {
      constructor(public bar: Bar) {}
    }
    class Bar {
      constructor(public foo: Foo) {}
    }

    const container: DIContainer = new DIContainer();
    container.add({
      foo: new ObjectResolver(Foo).construct(use("bar")),
      bar: new ObjectResolver(Bar).construct(use("foo")),
    });
    expect(() => {
      container.get("foo");
    }).toThrow(
      'Circular Dependency is detected. Dependency: "foo", path: foo -> bar'
    );
  });

  test("it can detect circular dependencies in methods", () => {
    class Foo {
      public addBar(bar: Bar) {}
    }
    class Bar {
      constructor(public foo: Foo) {}
    }

    const container: DIContainer = new DIContainer();
    container.add({
      foo: new ObjectResolver(Foo).method("addBar", use("bar")),
      bar: new ObjectResolver(Bar).construct(use("foo")),
    });

    expect(() => {
      container.get("foo");
    }).toThrow(
      'Circular Dependency is detected. Dependency: "foo", path: foo -> bar'
    );
  });

  test("it can detect circular dependencies, complicated case", () => {
    class DbConnection {
      constructor() {}
    }
    class UsersRepo {
      constructor(public connection: DbConnection) {}
    }
    class CompaniesRepo {
      constructor(public connection: DbConnection) {}
    }
    class FooController {
      constructor(public usersRepo: UsersRepo, companiesRepo: CompaniesRepo) {}
    }

    const container: DIContainer = new DIContainer();
    container.add({
      connection: new DbConnection(),
      usersRepo: new ObjectResolver(UsersRepo).construct(use("connection")),
      companiesRepo: new ObjectResolver(CompaniesRepo).construct(
        use("connection")
      ),
      fooController: new ObjectResolver(FooController).construct(
        use("usersRepo"),
        use("companiesRepo")
      ),
    });

    const fooController = container.get("fooController");
    expect(fooController).not.toBeNull();
    expect(fooController).toBeInstanceOf(FooController);
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

    const container: DIContainer = new DIContainer();
    container.add({
      foo: new ObjectResolver(Foo).construct(use("bar")),
      bar: new ObjectResolver(Bar).construct(use("buzz")),
      buzz: new ObjectResolver(Buzz).construct(use("foo")),
    });
    expect(() => {
      container.get("foo");
    }).toThrowError(
      'Circular Dependency is detected. Dependency: "foo", path: foo -> bar -> buzz.'
    );
  });
});

describe("DIContainer async behaviour", () => {
  /**
   * It's an interesting case need to get back to it
   */
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

    const container: DIContainer = new DIContainer();
    container.add({
      dsn: new RawValueResolver("DSN-secret"),
      dbConnection: factory((container: IDIContainer) => {
        return new Promise((resolve) =>
          setTimeout(() => {
            resolve(container.get("dsn"));
          })
        );
      }),
      TestUserRepository: object(TestUserRepository).construct(
        use("dbConnection")
      ),
    });

    const userRepository = container.get("TestUserRepository");
    expect(await userRepository.findUser()).toBe("DSN-secret + findUser");
  });
});
