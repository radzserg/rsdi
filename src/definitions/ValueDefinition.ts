import BaseDefinition from "./BaseDefinition";

export default class ValueDefinition extends BaseDefinition {
    private readonly value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }

    resolve = <T>(): T => {
        return this.value as T;
    }
}
