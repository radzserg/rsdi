import BaseDefinition from "../definitions/BaseDefinition";
import DIContainer  from "../DIContainer";

/**
 * Represents already defined dependency
 */
export default class ExistingDefinition extends BaseDefinition {
    private readonly existingDefinitionName: string;

    constructor(existingDefinitionName: string) {
        super();
        this.existingDefinitionName = existingDefinitionName;
    }

    resolve = <T>(container: DIContainer, parentDeps: string[] = []): T => {
        return container.get(this.existingDefinitionName, parentDeps);
    };
}
