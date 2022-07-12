import { expectType } from "tsd";
import DIContainer, { IDIContainer } from "../../index";

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
});
