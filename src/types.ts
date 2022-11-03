export interface Class<T> extends Function {
    new(...args: any[]): T;
}

export type Register<T> = string | Class<T>;

export type Dependency<T> = string | Function | Class<T>;

export type Implementation<T> = unknown;

export type Resolve<T> = Register<T>
