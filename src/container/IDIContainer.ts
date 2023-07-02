export interface IDIContainer {
    get: <T>(serviceName: string) => T;
}
