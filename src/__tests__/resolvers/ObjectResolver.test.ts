import ObjectResolver from "../../resolvers/ObjectResolver";
import { Bar, Buzz, Foo, FooChild } from "../fakeClasses";
import DIContainer, { use } from "../../index";
import { InvalidConstructorError, MethodIsMissingError } from "../../errors";

describe(ObjectResolver.name, () => {
  const container: DIContainer = new DIContainer();
  test("it creates object of correct class and initiate constructor with deps", () => {
    const fakeName = "My name is Foo";
    const bar = new ObjectResolver(Bar);
    const definition = new ObjectResolver(Foo).construct(fakeName, bar);
    const instance = definition.resolve(container);
    expect(instance).toBeInstanceOf(Foo);
    expect(instance.name).toEqual(fakeName);
  });

  test("it can initiate child constructors", () => {
    const fakeName = "My name is FooChild";
    const bar = new ObjectResolver(Bar);
    const definition = new ObjectResolver(FooChild).construct(fakeName, bar);
    const instance = definition.resolve(container);
    expect(instance).toBeInstanceOf(FooChild);
    expect(instance.name).toEqual(fakeName);
  });

  test("it resolves Definition params passed in constructor", () => {
    const fakeName = "My name is Foo";
    const BarDefinition = new ObjectResolver(Bar);
    const definition = new ObjectResolver(Foo).construct(
      fakeName,
      BarDefinition
    );
    const instance = definition.resolve(container);
    expect(instance).toBeInstanceOf(Foo);
    expect(instance.name).toEqual(fakeName);
    expect(instance.service.buzz()).toEqual("buzz");
  });

  test("it calls methods after object have been initiated", () => {
    const definition = new ObjectResolver(Foo)
      .construct("string", new Bar())
      .method("addItem", "item1")
      .method("addItem", "item2");
    const instance = definition.resolve(container);
    expect(instance).toBeInstanceOf(Foo);
    expect(instance.items).toEqual(["item1", "item2"]);
  });

  test("it throws an error if method does not exist", () => {
    const definition = new ObjectResolver(Bar).method(
      "undefinedMethod",
      // @ts-ignore rsdi identifies incorrect method
      "item1"
    );
    expect(() => {
      definition.resolve(container);
    }).toThrow(new MethodIsMissingError("Bar", "undefinedMethod"));
  });

  test.each([[undefined], [() => {}], ["abc"]])(
    "it throws an error if invalid constructor have been provided",
    () => {
      expect((constructorFunction: any) => {
        new ObjectResolver(constructorFunction);
      }).toThrow(new InvalidConstructorError());
    }
  );

  test("it resolves deps while calling method", () => {
    container.add({ key1: "value1" });
    const definition = new ObjectResolver(Foo)
      .construct("str", new Bar())
      .method("addItem", use("key1"));
    const instance = definition.resolve(container);
    expect(instance.items).toEqual(["value1"]);
  });

  test("it resolves a class without explicit controller", () => {
    const definition = new ObjectResolver(Buzz);
    const instance = definition.resolve(container);
    expect(instance).toBeInstanceOf(Buzz);
  });
});
