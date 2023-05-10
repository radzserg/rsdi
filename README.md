# Dependency Injection Container

# Getting Started

-   [Features](#features)
-   [Motivation](#motivation)
-   [Usage](#usage)

## Features

-   Simple but powerful
-   Does not requires decorators
-   Works great with both javascript and typescript
-   Auto register dependencies class.

## Motivation

Popular solutions like `inversify` or `tsyringe` use `reflect-metadata` that allows to fetch argument types and based on
those types and do autowiring. Autowiring is a nice feature but the trade-off is decorators.
Disadvantages of other solutions

1.  Those solutions work with typescript only. Since they rely on argument types that we don't have in Javascript.
2.  I have to update my tsconfig because one package requires it.
3.  Let my components know about injections.

## Usage

### Register Class with Class dependency

```typescript
export class A {
    constructor(private b: B) { }

    public sum(x: number, y: number) {
        return this.b.sum(x, y);
    }
}

export class B {
    public sum(x: number, y: number) {
        return x + y;
    }
}

const dependencies = [
  register(A).withDependency(B).build(),
];

Container.register(dependencies);

const a = Container.resolve(A);

expect(a.sum(1, 2)).toBe(3);
```

### Register interface with class implementation

```typescript
export interface Interface {
    doSomething(): string;
}

export class InterfaceImplementation implements Interface {
    doSomething(): string {
        return "HI";
    }
}

export class ClassWithInterfaceDependency {
    constructor(private readonly dependency: Interface) {

    }
    doSomething(): string {
        return this.dependency.doSomething();
    }
}

Container.register([
  register("Interface").withImplementation(InterfaceImplementation).build(),
  register(ClassWithInterfaceDependency).withDependency("Interface").build(),
]);

const resolved = Container.resolve(ClassWithInterfaceDependency);

expect(resolved.doSomething()).toBe("HI")
```

### Register objects or functions as reference without any manipulation from container

    const FooFunction = () => "HI";

    Container.register([
        register("Foo").withImplementation(FooFunction).build(),
    ]);

    const resolved = Container.resolve<typeof FooFunction>("Foo");

    expect(resolved).toBe(FooFunction);
    expect(resolved()).toBe("HI")

NOTE: The difference for withImplementation or withDynamic is that the first one just save the function reference, but the last one is used for hooks or dynamic functions with reactivity or re rendering cases.

### Register api

```typescript
//if you want register interfaces 👇
//register interface with custom string, because typescript doesn't transpile interfaces.
register("Interface").withDynamic(parameter: Function).build();
register("Interface").withImplementation(implementation: Function | Class | object).build();

//if you want register classes 👇
// Singleton registration
register(YourClass).asASingleton().build();

// Transient registration without dependencies
register(YourClass).build();

//The dependency can be a string because previously we can register interfaces.
register(YourClass).withDependency(dependency: string | Function | Class).build();

register(YourClass).withImplementation(implementation: Function | Class | object).build();
```
