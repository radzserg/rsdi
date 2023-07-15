import { Container } from "./Container";
import { register } from "./DependencyBuilder";
import { useResolve } from "./useResolve";
import { Ref } from "./types";

export default Container;

export { register, useResolve, Ref as Class };
