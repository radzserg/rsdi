import BaseDefinition, { Mode } from "./BaseDefinition";

export default class ValueDefinition extends BaseDefinition {
    private readonly value: any;

    constructor(value: any) {
        super(Mode.SINGLETON);
        this.value = value;
    }

    resolve = <T>(): T => {
        return this.value as T;
    };
}
