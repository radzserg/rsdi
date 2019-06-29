import {IDefinition} from "definitions/IDefinition";

abstract class BaseDefinition implements IDefinition{
    private readonly definitionName: string;

    protected constructor(name: string) {
        this.definitionName = name;
    }

    public name(): string {
        return this.definitionName;
    }

    public abstract resolve: <T>() => T;
}

export default BaseDefinition;