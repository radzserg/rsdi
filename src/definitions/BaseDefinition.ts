import {IDIContainer} from "../DIContainer";
import {IDefinition} from "./IDefinition";

abstract class BaseDefinition implements IDefinition {
    public abstract resolve: <T>(container: IDIContainer) => T;
}

export default BaseDefinition;
