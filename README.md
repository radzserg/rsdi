# RSDI - Dependency Injection Container

Simple and powerful dependency injection container for JavaScript/TypeScript.

# Getting Started

```typescript
// your classes and factories
class CookieStorage {}
class AuthStorage {
    constructor(storage: CookieStorage) {}
}
class Logger {}
class DummyLogger extends Logger {}

function loggerFactory(container: IDIContainer): Logger {
    const env = container.get("ENV");
    if (env === "test") {
        return new DummyLogger();
    }
    return new Logger();
}


// configure DI container
import DIContainer, { object, use, factory, IDIContainer } from "rsdi";

export default function configureDI() {
    const container: DIContainer = new DIContainer();
    container.add({
        ENV: "test", // define raw value
        AuthStorage: object(AuthStorage).construct(
            use(Storage) // refer to another dependency
        ),
        Storage: object(CookieStorage), // constructor without arguments
        Logger: factory(loggerFactory), // factory 
    });
    return container;
}

// in your entry point code
const container = configureDI();
const env: string = container.get("ENV"); // test
const authStorage: AuthStorage = container.get(AuthStorage); // object of AuthStorage
const logger: Logger = container.get(loggerFactory); // object of DummyLogger
```

**All resolvers are resolved only once and their result persists over the life of the container.**

-   [Features](#features)
-   [Motivation](#motivation)
-   [Usage](#usage)
    -   [Raw values](#raw-values)
    -   [Object resolver](#object-resolver)
    -   [Factory resolver](#factory-resolver)
    -   [Async factory resolver](#async-factory-resolver)

## Features

-   Simple but powerful
-   Does not requires decorators
-   Great types resolution
-   Works great with both javascript and typescript

## Motivation

Popular dependency injection libraries use `reflect-metadata` that allows to fetch argument types and based on
those types and do autowiring. Autowiring is a nice feature but the trade-off is decorators.

```typescript
@injectable()
class Foo {}
```

Why component Foo should know that it's injectable? 

Your business logic depends on a specific framework that is not part of your domain model and can change.

More thoughts in a [dedicated article](https://radzserg.medium.com/https-medium-com-radzserg-dependency-injection-in-react-part-2-995e93b3327c)

## Usage

### Raw values

Dependencies are set as raw values. No lazy initialisation happens. Container keeps and return raw values.

```typescript
import DIContainer from "rsdi";

const container: DIContainer = new DIContainer();
container.add({
    ENV: "PRODUCTION",
    HTTP_PORT: 3000,
    storage: new CookieStorage(),
});
const env: string = container.get("ENV");
const port: number = container.get("HTTP_PORT");
const authStorage: AuthStorage = container.get(AuthStorage); // instance of AuthStorage
```

### Object resolver

`object(ClassName)` - constructs an instance of the given class. The simplest scenario it calls the class constructor `new ClassName()`. 
When you need to pass arguments to the constructor, you can use `construct` method. You can refer to the already defined 
dependencies via the `use` helper, or you can pass raw values.

If you need to call object method after initialization you can use `method` it will be called after constructor.

```typescript

class ControllerContainer {
    constructor(authStorage: AuthStorage, logger: Logger) {}

    add(controller: Controller) {
        this.controllers.push(controller)
    }
}

import DIContainer, { object, use } from "rsdi";

const container: DIContainer = new DIContainer();
container.add({
    Storage: object(CookieStorage), // constructor without arguments
    AuthStorage: object(AuthStorage).construct(
        use(Storage)              // refers to existing dependency
    ),
    UsersController: object(UserController),
    PostsController: object(PostsController),
    ControllerContainer: object(MainCliCommand)
        .construct(use(AuthStorage), new Logger()) // use existing dependency, or pass raw values
        .method("add", use(UsersController))        // call class method after initialization    
        .method("add", use(PostsController)),
});

```


##  @todo update docs 

### Factory resolver

You can use factory resolver when you need more flexibility during initialisation. `container: IDIContainer` will be
pass as an argument to the factory method. So you can resolve other dependencies inside the factory function.

```typescript
import DIContainer, { factory, IDIContainer } from "rsdi";

const container = new DIContainer();
container.addDefinitions({
    BrowserHistory: factory(configureHistory),
});

function configureHistory(container: IDIContainer): History {
    const history = createBrowserHistory();
    const env = container.get("ENV");
    if (env === "production") {
        // do what you need
    }
    return history;
}
const history = container.get<History>("BrowserHistory");
```

### Async factory resolver

RSDI intentionally does not provide the ability to resolve asynchronous dependencies. The container works with
resources. All resources will be used sooner or later. The lazy initialization feature won't be of much benefit
in this case. At the same time, mixing synchronous and asynchronous resolution will cause confusion primarily for
the consumers.

The following approach will work in most scenarios.

```typescript
// UserRepository.ts
class UserRepository {
    public constructor(private readonly dbConnection: any) {} // some ORM that requires opened connection

    async findUser() {
        return await this.dbConnection.find(/*...params...*/);
    }
}

// configureDI.ts
import { createConnections } from "my-orm-library";
import DIContainer, { factory, use, IDIContainer } from "rsdi";

async function configureDI() {
    // initialize async factories before DI container initialisation
    const dbConnection = await createConnections();

    const container = new DIContainer();
    container.addDefinitions({
        DbConnection: dbConnection,
        UserRepository: object(UserRepository).construct(use("DbConnection")),
    });
    return container;
}

// main.ts
const diContainer = await configureDI();
const userRepository = diContainer.get<UserRepository>("UserRepository");
```
