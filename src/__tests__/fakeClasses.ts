import { Factory } from "../Container";

export class Foo {
    public name: string;
    public service: Bar;
    public items: string[] = [];

    constructor(name: string, service: Bar) {
        this.name = name;
        this.service = service;
    }

    addItem(item: string) {
        this.items.push(item);
    }
}

export class Bar {
    public bar() {
        return "bar";
    }
}

export class Buzz {
    public buzz() {
        return "buzz";
    }
}

export abstract class AbstractFoo {
    public name: string;
    public service: Bar;
    public items: string[] = [];

    constructor(name: string, service: Bar) {
        this.name = name;
        this.service = service;
    }

    addItem(item: string) {
        this.items.push(item);
    }
}

export class FooChild extends AbstractFoo {}

export class A {
    constructor(private b: B) {}

    public sum(x: number, y: number) {
        return this.b.sum(x, y);
    }
}

export class B {
    constructor(private c: C) {}

    public sum(x: number, y: number) {
        return this.c.sum(x, y);
    }

    public add(value: any) {
        this.c.add(value);
    }

    public get() {
        return this.c.get();
    }
}

export class C {
    public sum(x: number, y: number) {
        return x + y;
    }

    private raw: any;
    public add(value: any) {
        this.raw = value;
    }
    public get() {
        return this.raw;
    }
}

export interface Interface {
    doSomething(): string;
}

export class InterfaceImplementation implements Interface {
    doSomething(): string {
        return "HI";
    }
}

export class ClassWithInterfaceDependency implements Interface {
    constructor(private readonly dependency: Interface) {}
    doSomething(): string {
        return this.dependency.doSomething();
    }
}

export class Root {
    constructor(public innerA: InnerRoot, public innerB: InnerRootB) {}
}

export class InnerRoot {
    constructor(public inner: InnerDep) {}
}

export class InnerRootB {
    constructor(public inner: InnerDep) {}
}

export class InnerDep {
    public value: string = "";
}

export class FactoryImplementation extends Factory {
    public create(type: "Bar" | "Buzz") {
        if (type === "Bar") {
            return this.resolver.resolve(Bar);
        }

        return this.resolver.resolve(Buzz);
    }
}
