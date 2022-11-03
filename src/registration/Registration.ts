import { Mode } from "../definitions/BaseDefinition";

export class Registration {
    public constructor(
        public readonly mode: Mode,
        public readonly type: any,
        public readonly dependencies: Registration[],
        public readonly implementation?: any
    ) { }
}
