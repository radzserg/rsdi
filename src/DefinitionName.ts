import { NamedResolvers, ResolverName } from "./types";

export function definitionNameToString<
  ContainerResolvers extends NamedResolvers = {}
>(definitionName: ResolverName<ContainerResolvers>): string {
  if (
    typeof definitionName === "object" ||
    (typeof definitionName === "function" && definitionName.name)
  ) {
    return definitionName.name.toString();
  }
  return definitionName.toString();
}
