import BaseDefinition from "./BaseDefinition";

/**
 * Raw value definition
 */
export default class ValueDefinition<T extends any> extends BaseDefinition<T> {
    private readonly value: T;

    constructor(value: T) {
        super();
        this.value = value;
    }

    resolve = (): T => {
        return this.value;
    };
}
