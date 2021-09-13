import BaseDefinition from "./BaseDefinition";

/**
 * Raw value definition
 */
export default class ValueDefinition<T extends any> extends BaseDefinition<T> {
    private readonly value: any;

    constructor(value: T) {
        super();
        this.value = value;
    }

    resolve = <Y extends T>(): Y => {
        return this.value as Y;
    };
}
