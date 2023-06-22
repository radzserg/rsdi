import { Container } from "./Container";
import { ResolveArg } from "./types";

export const useResolve = <T>(ctor: ResolveArg<T>) => {
    return Container.resolve<T>(ctor);
};