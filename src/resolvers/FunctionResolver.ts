import AbstractResolver from "./AbstractResolver";
import { FactoryDefinitionError } from "../errors";
import { IDIContainer, WrapWithResolver } from "../types";
import { resolveFunctionParameters } from "../DIContainer";

/**
 * FunctionResolver - allows to use custom function with specified parameters, where parameters are references to
 * existing dependencies
 */
export default class FunctionResolver<
    T extends (...args: any) => any
> extends AbstractResolver<ReturnType<T>> {
    private readonly parameters: any[];

    constructor(
        private readonly func: T,
        ...parameters: T extends (...args: infer ArgTypes) => any
            ? WrapWithResolver<ArgTypes>
            : never
    ) {
        super();
        if (typeof func !== "function") {
            throw new FactoryDefinitionError();
        }
        this.func = func;
        this.parameters = parameters;
    }

    resolve = (
        container: IDIContainer,
        parentDeps?: string[]
    ): ReturnType<T> => {
        const parameters = resolveFunctionParameters(
            container,
            this.parameters,
            parentDeps
        );
        return this.func(...parameters);
    };
}
