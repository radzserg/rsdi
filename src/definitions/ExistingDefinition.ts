import BaseDefinition from "../definitions/BaseDefinition";
import {IDIContainer} from "../DIContainer";

export default class ExistingDefinition extends BaseDefinition {
    private readonly existingDefinitionName: string;

    constructor(name: string, existingDefinitionName: string) {
        super(name);
        this.existingDefinitionName = existingDefinitionName;
    }

    resolve = <T>(container: IDIContainer): T => {
        return container.get(this.existingDefinitionName);
    };
}
