import {
  AnyNamedResolvers,
  FetchClassesFromContainerResolvers,
  FetchFactoriesFromContainerResolvers,
  FetchFunctionsFromContainerResolvers,
  ResolverName,
  ResolveUsingSelfType,
  TryResolveUsingExistingResolvers,
} from "../../types";
import { anyType, Bar, Foo } from "../fakeClasses";
import { expectAssignable, expectNotAssignable, expectType } from "tsd";
import RawValueResolver from "../../resolvers/RawValueResolver";
import ObjectResolver from "../../resolvers/ObjectResolver";
import FunctionResolver from "../../resolvers/FunctionResolver";
import FactoryResolver from "../../resolvers/FactoryResolver";

describe("ResolveUsingSelfType", () => {
  test("ResolveUsingSelfType when typeof class is provided", () => {
    const a: ResolveUsingSelfType<typeof Bar> = anyType();
    expectType<Bar>(a);
  });

  test("ResolveUsingSelfType when typeof class is provided", () => {
    const a: ResolveUsingSelfType<() => { a: 123; b: "string" }> = anyType();
    expectType<{ a: 123; b: "string" }>(a);
  });

  test("ResolveUsingSelfType when typeof class is provided", () => {
    const a: ResolveUsingSelfType<() => { a: 123; b: "string" }> = anyType();
    expectType<{ a: 123; b: "string" }>(a);
  });
});

describe("ResolverName", () => {
  test("ResolverName resolves existing keys when container resolvers are defined", () => {
    type T = ResolverName<{
      a: RawValueResolver<string>;
      b: RawValueResolver<boolean>;
      foo: ObjectResolver<typeof Foo>;
    }>;
    expectAssignable<T>("a");
    expectAssignable<T>("b");
    expectAssignable<T>("foo");
    expectNotAssignable<T>("c");
  });

  test("ResolverName resolves to any when container resolvers are not defined", () => {
    type T = ResolverName;
    expectAssignable<T>("a");
    expectAssignable<T>("b");
  });

  test("FetchClasses fetches classes from ResolverName", () => {
    type T = FetchClassesFromContainerResolvers<{
      a: RawValueResolver<string>;
      b: RawValueResolver<boolean>;
      foo: ObjectResolver<typeof Foo>;
      bar: ObjectResolver<typeof Bar>;
    }>;
    expectAssignable<T>(Foo);
    expectAssignable<T>(Bar);
  });

  test("FetchFunctions fetches functions from ResolverName", () => {
    function fooFunc() {
      return { a: 123, b: "asd" };
    }

    type T = FetchFunctionsFromContainerResolvers<{
      a: RawValueResolver<string>;
      fooFunc: FunctionResolver<() => { a: number; b: string }>;
    }>;
    expectAssignable<T>(fooFunc);
  });

  test("FetchFactories fetches factories from ResolverName", () => {
    function fooFunc() {
      return { a: 123, b: "asd" };
    }

    type T = FetchFactoriesFromContainerResolvers<{
      a: RawValueResolver<string>;
      fooFunc: FactoryResolver<() => { a: number; b: string }>;
    }>;
    expectAssignable<T>(fooFunc);
  });

  test("ResolverName resolves to instance of class when typeof class is provided", () => {
    type T = ResolverName<{
      foo: ObjectResolver<typeof Foo>;
      bar: ObjectResolver<typeof Bar>;
      a: RawValueResolver<string>;
    }>;
    expectAssignable<T>(Foo);
    expectAssignable<T>(Bar);
  });

  test("ResolverName resolves to function when function is provided", () => {
    function fooFunc() {
      return { a: 123, b: "asd" };
    }
    type T = ResolverName<{
      a: RawValueResolver<string>;
      b: RawValueResolver<boolean>;
      fooFunc: FunctionResolver<() => { a: number; b: string }>;
    }>;
    expectAssignable<T>(fooFunc);
  });

  test("ResolverName resolves to factory name", () => {
    function fooFunc() {
      return { a: 123, b: "asd" };
    }
    type T = ResolverName<{
      a: RawValueResolver<string>;
      b: RawValueResolver<boolean>;
      fooFunc: FactoryResolver<() => { a: number; b: string }>;
    }>;

    expectAssignable<T>(fooFunc);
  });
});

describe("TryResolveUsingExistingResolvers", () => {
  test("resolves existing resolvers", () => {
    type ExistingResolvers = {
      a: RawValueResolver<Date>;
      b: RawValueResolver<Set<bigint>>;
    };

    const a: TryResolveUsingExistingResolvers<"a", ExistingResolvers> =
      anyType();
    expectType<Date>(a);

    const b: TryResolveUsingExistingResolvers<"b", ExistingResolvers> =
      anyType();
    expectType<Set<bigint>>(b);

    // @ts-ignore
    const nonExistedKeyValue: TryResolveUsingExistingResolvers<
      "c",
      ExistingResolvers
    > = {} as unknown;
    expectType<never>(nonExistedKeyValue);
  });

  test("resolves any resolvers", () => {
    const a: TryResolveUsingExistingResolvers<"a", AnyNamedResolvers> =
      anyType();
    expectType<any>(a);
  });
});
