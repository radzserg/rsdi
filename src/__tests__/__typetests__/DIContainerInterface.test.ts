import { expectType } from "tsd";
import { IDIContainer } from "../../index";

describe("IDIContainer types", () => {
  test("if resolves types based on defined resolvers", () => {
    const b: string = ({} as IDIContainer).get("foo");
    expectType<string>(b);
  });
});
