import BaseDefinition from "./BaseDefinition";

export default class ValueDefinition extends BaseDefinition {
    private readonly value: any;

    constructor(
        name: string,
        value: any
    ) {
        super(name);
        this.value = value;
    }

    resolve = <T>(): T => {
        return this.value as T;
    }
}
