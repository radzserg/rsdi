import DIContainer from "../../container/DIContainer";
import { IDIContainer, Resolver } from "../../container/IDIContainer";
import FactoryDefinition from "../FactoryDefinition";
import ValueDefinition from "../ValueDefinition";

describe("FactoryDefinition", () => {
    test("it invokes simple factory and resolves value", () => {
        const definition = new FactoryDefinition(() => "Value");
        expect(definition).toBeInstanceOf(FactoryDefinition);
        expect(definition.resolve(new DIContainer())).toEqual("Value");
    });

    test("it resolves value using values from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new FactoryDefinition((resolver: Resolver) => {
            return resolver.resolve("key1");
        });
        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it resolves value using async factory", async () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new FactoryDefinition(async (resolver: Resolver) => {
            return await new Promise((resolve) =>
                setTimeout(() => {
                    resolve(resolver.resolve("key1"));
                })
            );
        });

        expect(await definition.resolve(container)).toEqual("value1");
    });
});
