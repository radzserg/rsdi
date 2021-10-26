# RSDI - Dependency Injection Container

Simple and powerful dependency injection container for JavaScript/TypeScript.

# Getting Started

Given that you have classes and factories in your application

```typescript
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
function UsersRepoFactory(knex: Knex): UsersRepo {
    return {
        async findById(id: number) {
            await knex("users").where({ id });
        },
    };
}
```

Your DI container initialisation will include

```typescript
import DIContainer, { object, use, factory, IDIContainer } from "rsdi";

export default function configureDI() {
    const container = new DIContainer();
    container.add({
        ENV: "test", // define raw value
        Storage: object(CookieStorage), // constructor without arguments
        AuthStorage: object(AuthStorage).construct(
            use(Storage) // refer to another dependency
        ),
        knex: knex(),
        Logger: factory(loggerFactory),
        UsersRepo: factory((container: IDIContainer) => {
            return UsersRepoFactory(container.get("knex"));
        }),
    });
    return container;
}
```

The entry point of your application will include

```typescript
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
-   [Advanced Usage](#advanced-usage)
    -   [Typescript type resolution](#typescript-type-resolution)
    -   [Dependency declaration](#dependency-declaration)
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

const container = new DIContainer();
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
// test class
class ControllerContainer {
    constructor(authStorage: AuthStorage, logger: Logger) {}

    add(controller: Controller) {
        this.controllers.push(controller);
    }
}

// container
const container = new DIContainer();
container.add({
    Storage: object(CookieStorage), // constructor without arguments
    AuthStorage: object(AuthStorage).construct(
        use(Storage) // refers to existing dependency
    ),
    UsersController: object(UserController),
    PostsController: object(PostsController),
    ControllerContainer: object(MainCliCommand)
        .construct(use(AuthStorage), new Logger()) // use existing dependency, or pass raw values
        .method("add", use(UsersController)) // call class method after initialization
        .method("add", use(PostsController)),
});
```

### Factory resolver

You can use factory resolver when you need more flexibility during initialization. `container: IDIContainer` will be
passed in as an argument to the factory method. So you can resolve other dependencies inside the factory function.

```typescript
const container = new DIContainer();
container.add({
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

## Advanced Usage

### Typescript type resolution

`container.get` and `use` helper resolve type based on following convention:

-   if given name is class - instance of a class
-   if given name is function - return type of function
-   if custom generic type is provided - custom type
-   otherwise - any

```typescript
const container: DIContainer = new DIContainer();
container.add({
    Bar: new Bar(),
    Foo: new Bar(), // fake foo example
});
let bar: Bar = container.get(Bar); // types defined based on a given type Bar
let foo: Foo = container.get(Foo); // you can trick TS compiler (it's your responsibility)
let foo2: Foo = container.get<Foo>("Foo"); // custom generic type is provided
let foo3: Foo = container.get("Foo"); // any type
```

Example: `use` defines type for a class constructor. 

```typescript
class Foo {
    constructor(private readonly bar: Bar) {}
}

const container: DIContainer = new DIContainer();
container.add({
    Bar: new Bar(),
    Foo: object(Foo).construct(use(Bar)), // constuct method checks type and use return Bar type
});
```

Example:  `container.get` resolve type based on a given factory return type.

```typescript
function myFactory() {
    return { a: 123 };
}
container.add({
    myFactory: factory((container: IDIContainer) => {
        return myFactory();
    }),
});
let { a } = container.get(myFactory);
```

### Dependency declaration

RSDI resolves dependencies on a given type. It can be string or function. In the simplest case, you can use strings.

```typescript
container.add({
    Foo: new Foo(),
});
const foo = container.get<Foo>("Foo");
```
In order to avoid magic strings you can operate with types. 
```typescript
const foo = container.get(Foo);
```
RSDI uses `Foo.name` behind the scene that equals to "Foo". Remember that this approach will not work for uglified code.
You can also rename the function Foo => Buzz, and forget to rename the declaration. From that perspective you can 
declare dependencies this way. 
```typescript
container.add({
    [Foo.name]: new Foo(),
    [MyFactory.name]: MyFactory()
});
const foo = container.get(Foo);
const buzz = container.get(MyFactory);
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
import DIContainer, { factory, use } from "rsdi";

async function configureDI() {
    // initialize async factories before DI container initialisation
    const dbConnection = await createConnections();

    const container = new DIContainer();
    container.add({
        DbConnection: dbConnection,
        UserRepository: object(UserRepository).construct(use("DbConnection")),
    });
    return container;
}

// main.ts
const diContainer = await configureDI();
const userRepository = diContainer.get<UserRepository>("UserRepository");
```
