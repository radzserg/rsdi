import BaseDefinition from "../definitions/BaseDefinition";
import DIContainer, { IDIContainer } from "../DIContainer";

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 */
export default class ExistingDefinition<T> extends BaseDefinition<T> {
    private readonly existingDefinitionName: string;

    constructor(existingDefinitionName: string) {
        super();
        this.existingDefinitionName = existingDefinitionName;
    }

    resolve = <T>(container: IDIContainer, parentDeps: string[] = []): T => {
        return (container as DIContainer).get(
            this.existingDefinitionName,
            parentDeps
        );
    };
}
