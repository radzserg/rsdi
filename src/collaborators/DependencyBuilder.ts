import { Dependency } from "../definitions/Dependency";

export const build = (type: any, ...parameters: any[]): Dependency => {
    return new Dependency(type, [...parameters]);
};
