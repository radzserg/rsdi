import ReferenceResolver from "../../../resolvers/ReferenceResolver";
import { anyType, Foo } from "../../fakeClasses";
import DIContainer from "../../../DIContainer";
import { expectType } from "tsd";
import RawValueResolver from "../../../resolvers/RawValueResolver";
import ObjectResolver from "../../../resolvers/ObjectResolver";

describe("ReferenceResolver types", () => {
  test("Return any type if existing dependencies are not set", () => {
    const resolver: ReferenceResolver = anyType();
    const value = resolver.resolve(anyType() as DIContainer);
    expectType<any>(value);
  });

  test("Return specified type if existing dependencies are not set", () => {
    const resolver: ReferenceResolver = anyType();
    const value: boolean = resolver.resolve(anyType() as DIContainer);
    expectType<boolean>(value);
  });

  test("Return type based on existing dependencies", () => {
    type ExistingDependencies = {
      a: RawValueResolver<string>;
      b: RawValueResolver<boolean>;
      foo: ObjectResolver<typeof Foo>;
    };

    const bResolver: ReferenceResolver<ExistingDependencies, "b"> = anyType();
    const bValue = bResolver.resolve(anyType() as DIContainer<{}>);
    expectType<boolean>(bValue);

    const fooResolver: ReferenceResolver<ExistingDependencies, "foo"> =
      anyType();
    const fooValue = fooResolver.resolve(anyType() as DIContainer<{}>);
    expectType<Foo>(fooValue);
  });
});
