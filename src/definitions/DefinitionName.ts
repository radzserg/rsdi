export type DefinitionName = string | { name: string };

export function definitionNameToString(definitionName: DefinitionName): string {
    if (typeof definitionName === "string") {
        return definitionName;
    }
    return definitionName.name;
}
