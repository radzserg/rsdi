import BaseDefinition from "../definitions/BaseDefinition";
import DIContainer, { IDIContainer } from "../DIContainer";

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 */
export default class ExistingDefinition<T = any> extends BaseDefinition<T> {
    private readonly existingDefinitionName: string;

    constructor(existingDefinitionName: string) {
        super();
        this.existingDefinitionName = existingDefinitionName;
    }

    resolve = <Y extends T>(container: IDIContainer, parentDeps: string[] = []): Y => {
        return (container as DIContainer).get(
            this.existingDefinitionName,
            parentDeps
        );
    };
}
