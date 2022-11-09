import { Mode } from "../types";
import DIContainer from "../container/DIContainer";
import BaseDefinition from "./BaseDefinition";

export default class ExistingDefinition extends BaseDefinition {
    constructor(private readonly existingDefinitionName: string) {
        super(Mode.TRANSIENT);
    }

    resolve<T>(container: DIContainer, parentDeps: string[] = []): T {
        return container.get(this.existingDefinitionName, parentDeps);
    }
}
