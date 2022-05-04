import { Bar, Foo } from "./fakeClasses";

import ObjectResolver from "../resolvers/ObjectResolver";
import RawValueResolver from "../resolvers/RawValueResolver";
import DIContainer from "../DIContainer";
import {
  diFactory,
  diFunc,
  diObject,
  diUse,
  diValue,
} from "../resolversShorthands";

describe("definitionBuilders", () => {
  let container: DIContainer;
  beforeEach(() => {
    container = new DIContainer();
  });
  test("it resolves existing definition", () => {
    container.add({ key1: new RawValueResolver("value1") });
    const definition = diUse("key1");

    expect(definition.resolve(container)).toEqual("value1");
  });

  test("it create value definition", () => {
    const definition = diValue("bar");
    expect(definition.resolve()).toEqual("bar");
  });

  test("it creates object of correct class", () => {
    const bar = new ObjectResolver(Bar);
    const definition = diObject(Foo).construct("a", bar);

    expect(definition).toBeInstanceOf(ObjectResolver);
    expect(definition.resolve(container)).toBeInstanceOf(Foo);
  });

  test("it names dependency using class name", () => {
    const definition = diObject(Foo);

    expect(definition).toBeInstanceOf(ObjectResolver);
  });

  test("it creates function definition", () => {
    function funcA(s: string) {
      return s;
    }
    const definition = diFunc(funcA, "abc");
    expect(definition.resolve(container)).toEqual("abc");
  });

  test("it creates function definition with shorthand function", () => {
    const definition = diFunc((s: string) => s, "abc");
    expect(definition.resolve(container)).toEqual("abc");
  });

  test("it creates factory definition", () => {
    const definition = diFactory(() => {
      return { a: 123 };
    });

    expect(definition.resolve(container)).toEqual({ a: 123 });
  });
});
