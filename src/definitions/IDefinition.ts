export interface IDefinition {
    name: () => string;
    resolve: <T>() => T;
}
