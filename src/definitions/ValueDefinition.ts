import BaseDefinition from "./BaseDefinition";

/**
 * ValueDefinition keeps raw value of any type.
 *
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
