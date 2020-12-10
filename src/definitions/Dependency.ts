import { Mode } from "./BaseDefinition";

export class Dependency {
    public constructor(
        public readonly mode: Mode,
        public readonly type: any,
        public readonly parameters: Dependency[]
    ) {}
}
