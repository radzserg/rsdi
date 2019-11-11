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
    public buzz() {
        return "buzz";
    }
}

export class Buzz {
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

export class FooChild extends AbstractFoo {

}