import FactoryDefinition from "../FactoryDefinition";
import DIContainer, { IDIContainer } from "../../index";
import ValueDefinition from "../ValueDefinition";
import { FactoryDefinitionError } from "../../errors";

describe("FactoryDefinition", () => {
    test("it throw an error when factory is not a function", () => {
        expect(() => {
            // @ts-ignore
            new FactoryDefinition({});
        }).toThrow(new FactoryDefinitionError());
    });

    test("it invokes simple factory and resolves value", () => {
        const definition = new FactoryDefinition(() => "Value");
        expect(definition).toBeInstanceOf(FactoryDefinition);
        expect(definition.resolve(new DIContainer())).toEqual("Value");
    });

    test("it resolves value using values from container", () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new FactoryDefinition((container: IDIContainer) => {
            return container.get("key1");
        });
        expect(definition.resolve(container)).toEqual("value1");
    });

    test("it resolves value using async factory", async () => {
        const container = new DIContainer();
        container.addDefinition("key1", new ValueDefinition("value1"));
        const definition = new FactoryDefinition(
            async (container: IDIContainer) => {
                return await new Promise(resolve =>
                    setTimeout(() => {
                        resolve(container.get("key1"));
                    })
                );
            }
        );

        expect(await definition.resolve(container)).toEqual("value1");
    });
});
