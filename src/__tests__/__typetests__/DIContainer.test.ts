import DIContainer from "../../DIContainer";
import { Bar, Foo } from "../fakeClasses";
import { expectNotType, expectType } from "tsd";
import ObjectResolver from "../../resolvers/ObjectResolver";
import { factory, func, IDIContainer, object } from "../../index";
import { diUse } from "../../resolversShorthands";

describe("DIContainer typescript type resolution", () => {
  test("if resolves type as given raw values", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      key1: "string",
      key2: 123,
      bar: new Bar(),
      d: "" as unknown,
    });
    expectType<string>(container.get("key1"));
    expectType<number>(container.get("key2"));
    expectType<Bar>(container.get("bar"));

    // @ts-ignore
    expectNotType<string>(container.get("key2"));
    // @ts-ignore
    expectNotType<number>(container.get("key1"));
    expectNotType<number>(container.get("d"));
  });

  test("if resolves type as requested user defined types", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      key1: "string",
    });
    expectType<string>(container.get("key1"));
    const b: Boolean = (container as IDIContainer).get("key4");
    expectType<Boolean>(b);
  });

  test("if resolves type as class instance if class is provided", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      Foo: new ObjectResolver(Foo).construct("name1", new Bar()),
    });
    expectType<Foo>(container.get(Foo));
  });

  test("if resolves type as function return type", () => {
    const container: DIContainer = new DIContainer();
    function myFactory() {
      return { a: 123 };
    }
    container.add({
      myFactory: func(myFactory),
    });
    const { a } = container.get(myFactory);
    expectType<number>(a);
  });

  test("if resolves type as factory return type if function is provided", () => {
    const container: DIContainer = new DIContainer();
    function myFactory() {
      return { a: 123 };
    }
    container.add({
      myFactory: factory(() => {
        return myFactory();
      }),
    });
    const { a } = container.get(myFactory);
    expectType<number>(a);
  });

  test("if resolves type for diUse to match constructor parameters", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      Bar: new Bar(),
      Foo: new ObjectResolver(Foo).construct("some string", diUse(Bar)),
    });
    const resolvedFactory = container.get(Foo);
    expectType<Foo>(resolvedFactory);
  });

  test("it correctly resolves container.get inside factory", () => {
    const container: DIContainer = new DIContainer();
    function myFactory(bar: Bar) {
      return { a: bar.buzz() };
    }
    container.add({
      Bar: new Bar(),
      Foo: new Foo("s", new Bar()),
      myFactory: factory((container: IDIContainer) => {
        return myFactory(container.get(Bar));
      }),
    });

    const { a } = container.get("myFactory");
    expectType<string>(a);
  });

  test("it correctly resolves container.get function", () => {
    const container: DIContainer = new DIContainer();
    container.add({
      str: "hooray",
      bar: object(Bar),
    });
    expectType<string>(container.get("str"));
    expectType<Bar>(container.get("bar"));
    container.add({
      foo: object(Foo).construct("bla", container.get("bar")),
    });
    expectType<Foo>(container.get("foo"));
  });
});
