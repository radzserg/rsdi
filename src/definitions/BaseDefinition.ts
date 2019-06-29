abstract class BaseDefinition {
    private readonly definitionName: string;

    protected constructor(name: string) {
        this.definitionName = name;
    }

    protected name(): string {
        return this.definitionName;
    }

    public abstract resolve: <T>() => T;
}

export default BaseDefinition;