import { expectType } from "tsd";
import DIContainer, { IDIContainer } from "../../index";
import { Buzz, Foo } from "../fakeClasses";

describe("IDIContainer types", () => {
  test("if resolves types based on defined resolvers", () => {
    const b: string = ({} as IDIContainer).get("foo");
    expectType<string>(b);
  });

  test("IDIContainer is compatible with DIContainer", () => {
    function tearDown(diContainer: IDIContainer) {
      return "123";
    }
    const container = new DIContainer();
    expect(tearDown(container as IDIContainer)).toEqual("123");
  });

  test("if resolves types using provided type", () => {
    const b = ({} as IDIContainer).get<Foo>("foo");
    expectType<Foo>(b);
  });

  test("if resolves types using type object itself", () => {
    const b = ({} as IDIContainer).get(Foo);
    expectType<Foo>(b);
  });

  test("if resolves types using type function", () => {
    const foo = () => {
      return new Buzz();
    };
    const b = ({} as IDIContainer).get(foo);
    expectType<Buzz>(b);
  });
});
