# Dependency Injection Container

# Getting Started

-   [Features](#features)
-   [Motivation](#motivation)
-   [Usage](#usage)
    -   [Raw values](#raw-values)
    -   [Object definition](#object-definition)
    -   [Factory definition](#factory-definition)
    -   [Async factory definition](#async-factory-definition)

## Features

-   Simple but powerful
-   Does not requires decorators
-   Works great with both javascript and typescript

## Motivation

Popular solutions like `inversify` or `tsyringe` use `reflect-metadata` that allows to fetch argument types and based on
those types and do autowiring. Autowiring is a nice feature but the trade-off is decorators.
Disadvantages of other solutions

1. Those solutions work with typescript only. Since they rely on argument types that we don't have in Javascript.
2. I have to update my tsconfig because one package requires it.
3. Let my components know about injections.

## Usage

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

    // And also you can use fluent builder api
    const dependencies [register(AuthStorage).withDependency(CookieStorage).and(Foo).and(Bar).build(),
                        register(AuthStorage).asASingleton().build(),
                        register(AuthStorage).build()]

    Container.instance.register(dependencies);
}
```

**All definitions are resolved once and their result persists over the life of the container.**

### Raw values

When you specify raw values (i.e. don't use `object`, `factory` definitions) `rsdi` will resolve it as it is.

### Object definition

`object(ClassName)` - the simplest scenario that will call `new ClassName()`. When you need to pass arguments to the
constructor, you can use `construct` method. You can refer to the already defined dependencies via the `get` helper.
If you need to call object method after initialization you can use `method` it will be called after constructor.

### Factory definition

You can use factory definition when you need more flexibility during initialisation. `container: IDIContainer` will be
pass as an argument to the factory method. So you can resolve other dependencies inside the factory function.
