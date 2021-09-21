import AbstractResolver from "./AbstractResolver";
import DIContainer, { IDIContainer } from "../DIContainer";

/**
 * Refers to existing definition. i.e. definition with provided name must exists in DIContainer
 */
export default class ReferenceResolver<T = any> extends AbstractResolver<T> {
    private readonly existingDefinitionName: string;

    constructor(existingDefinitionName: string) {
        super();
        this.existingDefinitionName = existingDefinitionName;
    }

    resolve = <Y extends T>(container: IDIContainer, parentDeps: string[] = []): Y => {
        return (container as DIContainer<any>).get(
            this.existingDefinitionName,
            parentDeps
        );
    };
}
