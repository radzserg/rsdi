import { ResolverName } from "./DIContainer";

export function definitionNameToString(definitionName: ResolverName): string {
    if (typeof definitionName === "string") {
        return definitionName;
    }
    return definitionName.name;
}
