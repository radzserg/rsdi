import BaseDefinition from "../definitions/BaseDefinition";
import DIContainer, { IDIContainer } from "../DIContainer";

/**
 * Represents already defined dependency
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
