import { Mode } from "../types";
import BaseDefinition from "./BaseDefinition";

export default class ValueDefinition extends BaseDefinition {
    constructor(private readonly value: any) {
        super(Mode.SINGLETON);
    }

    resolve<T>(): T {
        return this.value as T;
    }
}
