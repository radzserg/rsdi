import { Foo } from "./__tests__/fakeClasses";
import { Type } from "./definitions/ObjectDefinition";


type Method<T, K extends keyof T> = T[K];
type MethodArgs<T extends Type<any>, K extends keyof InstanceType<T>> = Parameters<Method<InstanceType<T>, K>>;

let g: keyof typeof Foo;

function t<T extends keyof Foo>(name: T ): MethodArgs<typeof Foo, 'addItem'> {
  return {} as any;
}


let name: keyof Foo = 'addItem';
let a = t(name);


let K: keyof InstanceType<typeof Foo> = 'addItem';