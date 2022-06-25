# Dependency Injection Container

# Getting Started

-   [Features](#features)
-   [Motivation](#motivation)
-   [Usage](#usage)

## Features

-   Simple but powerful
-   Does not requires decorators
-   Works great with both javascript and typescript

## Motivation

Popular solutions like `inversify` or `tsyringe` use `reflect-metadata` that allows to fetch argument types and based on
those types and do autowiring. Autowiring is a nice feature but the trade-off is decorators.
Disadvantages of other solutions

1.  Those solutions work with typescript only. Since they rely on argument types that we don't have in Javascript.
2.  I have to update my tsconfig because one package requires it.
3.  Let my components know about injections.

## Usage

### Build dependencies API

```typescript
// your classes
class CookieStorage {}
class AuthStorage {
  constructor(storage: CookieStorage) {}
}

// configure DI container
import Container, { build, buildSingleton } from "rsdi";

export const configureDI = () => {
    // For transient instances
    const dependencies = [build(AuthStorage, CookieStorage)];

    // For singleton instances
    const dependencies = [buildSingleton(AuthStorage, CookieStorage)];

    // For transient instance for CookieStorage and AuthStorage singleton.
    const dependencies = [build(CookieStorage), buildSingleton(AuthStorage, CookieStorage)];

    Container.instance.register(dependencies);
}

```

### And also you can use fluent builder dependencies api

```typescript
class CookieStorage {}
class Foo {}
class AuthStorage {
  constructor(storage: CookieStorage, a: Foo) {}
}

// configure DI container
import Container, { register } from "rsdi";

export const configureDI() {
  // And also you can use fluent builder api
    const dependencies [register(AuthStorage).withDependency(CookieStorage).and(Foo).build(),
                        register(AuthStorage).asASingleton().build(),
                        register(AuthStorage).build()]

    Container.instance.register(dependencies);
}

```
