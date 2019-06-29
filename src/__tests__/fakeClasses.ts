export class Foo {
    public name: string;
    public service: Bar;

    constructor(name: string, service: Bar) {
        this.name = name;
        this.service = service;
    }
}

export class Bar {
    public buzz() {
        return "buzz";
    }
}