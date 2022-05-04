import { Bar, Foo } from "../fakeClasses";
import RawValueResolver from "../../resolvers/RawValueResolver";
import DIContainer from "../../DIContainer";
import {
  diFactory,
  diFunc,
  diObject,
  diUse,
  diValue,
} from "../../resolversShorthands";
import { expectNotType, expectType } from "tsd";
import { DependencyResolver } from "../../types";
import FactoryResolver from "../../resolvers/FactoryResolver";

describe("definitionBuilders respects typescript types", () => {
  let container: DIContainer;

  test("it overrides default resolved type", () => {
    container.add({ key1: new RawValueResolver(22) });
    const definition: DependencyResolver<string> = diUse<string>("key1");
    expectType<string>(definition.resolve(container));

    const definition2: DependencyResolver<Bar> = diUse<Bar>("key1");
    expectType<Bar>(definition2.resolve(container));
  });

  test("diGet resolves type as function return type based on function name", () => {
    function customFunction() {
      return { b: 123 };
    }
    container.add({ customFunction: new FactoryResolver(customFunction) });
    const definition: DependencyResolver<{ b: number }> = diUse(customFunction);
    const { b } = definition.resolve(container);
    expectType<number>(b);
  });

  test("diValue 'resolve' returns scalar", () => {
    const definition = diValue(22);
    const bar: number = definition.resolve();
    expectType<number>(bar);
  });

  test("diValue 'resolve' returns object class", () => {
    const definition = diValue(new Bar());
    const bar: Bar = definition.resolve();
    expectType<Bar>(bar);
  });

  test("diFunction 'resolve' returns function ReturnType", () => {
    const definition = diFunc((bar: Bar) => {
      return bar;
    }, new Bar());
    const resolvedBar = definition.resolve(container);
    expectType<Bar>(resolvedBar);
  });

  test("diFactory factory 'resolve' returns factory ReturnType as number", () => {
    const definition = diFactory(() => {
      return { a: 123 };
    });
    const resolved: { a: number } = definition.resolve(container);
    expectType<number>(resolved.a);
  });
  test("diFactory factory 'resolve' returns factory ReturnType as class object", () => {
    const definition = diFactory(() => {
      return { bar: new Bar() };
    });
    const resolved: { bar: Bar } = definition.resolve(container);
    expectType<Bar>(resolved.bar);
  });

  test("diObject factory 'resolve' returns object of a given class", () => {
    const definition = diObject(Foo);
    const foo: Foo = definition.resolve(container);
    expectType<Foo>(foo);
  });
});
