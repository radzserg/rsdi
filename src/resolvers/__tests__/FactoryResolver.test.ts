import FactoryResolver from "../FactoryResolver";
import DIContainer, { IDIContainer } from "../../index";
import RawValueResolver from "../RawValueResolver";
import { FactoryDefinitionError } from "../../errors";

describe("FactoryResolver", () => {
    test("it throw an error when factory is not a function", () => {
        expect(() => {
            // @ts-ignore
            new FactoryResolver({});
        }).toThrow(new FactoryDefinitionError());
    });

    test("it invokes simple factory and resolves value", () => {
        const definition = new FactoryResolver(() => "Value");
        expect(definition).toBeInstanceOf(FactoryResolver);
        expect(definition.resolve(new DIContainer())).toEqual("Value");
    });

    test("it resolves value using values from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new RawValueResolver("value1"));
        const definition = new FactoryResolver((container: IDIContainer) => {
            return container.get("key1");
        });
        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it resolves value using async factory", async () => {
        const container = new DIContainer();
        container.addDefinition("key1", new RawValueResolver("value1"));
        const definition = new FactoryResolver(
            async (container: IDIContainer) => {
                return await new Promise((resolve) =>
                    setTimeout(() => {
                        resolve(container.get("key1"));
                    })
                );
            }
        );

        expect(await definition.resolve(container)).toEqual("value1");
    });
});
