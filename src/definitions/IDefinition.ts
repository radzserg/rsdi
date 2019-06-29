export interface IDefinition {
    // @todo implement definitions
    // https://medium.com/@a.yurich.zuev/angular-how-staticinjector-replaces-reflectiveinjector-6f303d2798f6

    resolve: <T>() => T;
}