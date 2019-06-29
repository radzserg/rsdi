import {IDefinition} from "definitions/IDefinition";

export interface Type<T> extends Function {
    new (...args: any[]): T;
}

export default class ObjectDefinition implements IDefinition
{
    private readonly name: string;
    private readonly constructorFunction: Type<any>;

    constructor(name: string, constructorFunction: Type<any>) {
        this.name = name;
        this.constructorFunction = constructorFunction;
    }

    resolve = <T>(): T => {
        return new this.constructorFunction()
    }
}