# Dependency Injection Container

# Getting Started

```typescript
// your classes 
class CookieStorage {}
class AuthStorage {
  constructor(storage: CookieStorage) {}
}

// configure DI container
import DIContainer, { object, get, factory, IDIContainer } from "rsdi";

export default function configureDI() {
    const container = new DIContainer();
    container.addDefinitions({
        "ENV": "PRODUCTION",               // define raw value
        "AuthStorage": object(AuthStorage).construct(
            get("Storage")                         // refer to another dependency       
        ),
        "Storage": object(CookieStorage),         // constructor without arguments       
        "BrowserHistory": factory(configureHistory), // factory (will be called only once)  
    });
    return container;
}
    
function configureHistory(container: IDIContainer): History {
    const history = createBrowserHistory();
    const env = container.get("ENV");
    if (env === "production") {
        // do what you need
    }
    return history;
}

// in your entry point code
const container = configureDI();
const env = container.get<string>("ENV"); // PRODUCTION
const authStorage = container.get<AuthStorage>("AuthStorage");  // object of AuthStorage
const history = container.get<History>("BrowserHistory");  // History singleton will be returned

``` 

**All definitions are resolved once and their result persists over the life of the container.**


- [Features](#features)
- [Motivation](#motivation)
- [Usage](#usage)
    - [Raw values](#raw-values)
    - [Object definition](#object-definition)  
    - [Factory definition](#factory-definition)
    - [Async factory definition](#async-factory-definition)

## Features

- Simple but powerful 
- Does not requires decorators
- Works great with both javascript and typescript 

## Motivation 

Popular solutions like `inversify` or `tsyringe` use `reflect-metadata` that allows to fetch argument types and based on 
those types and do autowiring. Autowiring is a nice feature but the trade-off is decorators. 
Disadvantages of other solutions
1. Those solutions work with typescript only. Since they rely on argument types that we don't have in Javascript.
2. I have to update my tsconfig because one package requires it. 
3. Let my components know about injections. 

```typescript
@injectable()
class Foo {  
}
```
Why component Foo should know that it's injectable?

More details thoughts in my [blog article](https://medium.com/@radzserg/https-medium-com-radzserg-dependency-injection-in-react-part-1-c1decd9c2e7a) 

## Usage

### Raw values

```typescript
import DIContainer from "rsdi";

const container = new DIContainer();
container.addDefinitions({   
    "ENV": "PRODUCTION",  
    "AuthStorage": new AuthStorage(),
    "BrowserHistory": createBrowserHistory(),
});
const env = container.get<string>("ENV"); // PRODUCTION    
const authStorage = container.get<AuthStorage>("AuthStorage"); // instance of AuthStorage     
const authStorage = container.get<History>("BrowserHistory"); // instance of AuthStorage     
```

When you specify raw values (i.e. don't use `object`, `factory` definitions) `rsdi` will resolve it as it is. 

### Object definition

```typescript
  
import DIContainer, { object, get } from "rsdi";
  
const container = new DIContainer();
container.addDefinitions({
   "Storage": object(CookieStorage),         // constructor without arguments
   "AuthStorage": object(AuthStorage).construct(
      get("Storage")                         // refers to existing dependency       
   ),  
   "UsersController": object(UserController),
   "PostsController": object(PostsController),
   "ControllerContainer": object(ControllerContainer)
     .method('addController', get("UsersController"))
     .method('addController', get("PostsController"))
});
```

`object(ClassName)` - the simplest scenario that will call `new ClassName()`. When you need to pass arguments to the 
constructor, you can use `construct` method. You can refer to the already defined dependencies via the `get` helper. 
If you need to call object method after initialization you can use `method` it will be called after constructor. 

### Factory definition

You can use factory definition when you need more flexibility during initialisation. `container: IDIContainer` will be
pass as an argument to the factory method. So you can resolve other dependencies inside the factory function.

```typescript

import DIContainer, {  factory, IDIContainer } from "rsdi";

const container = new DIContainer();
container.addDefinitions({       
  "BrowserHistory": factory(configureHistory),   
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

### Async factory definition

RSDI intentionally does not provide the ability to resolve asynchronous dependencies. The container works with 
resources. All resources will be needed sooner or later. The lazy initialization feature won't be of much benefit 
in this case. At the same time, mixing synchronous and asynchronous resolution will cause confusion primarily for 
the consumers themselves.

The following approach will work in most scenarios.

```typescript

// UserRepository.ts
 class UserRepository {
    public constructor(private readonly dbConnection: any) {}
   
    async findUser() {       
        return await this.dbConnection.find(...)
    }
}

// configureDI.ts
import { createConnections } from "my-orm-library";
import DIContainer, {  factory, IDIContainer } from "rsdi";

async function configureDI() {}
    const dbConnection = await createConnections();
    
    const container = new DIContainer();
    container.addDefinitions({       
      "DbConnection": dbConnection,
      "UserRepository": object(UserRepository).construct(
        get("DbConnection")
      ) 
    });
    return container;
}

// main.ts
const diContainer = await configureDI();
const userRepository = diContainer.get<UserRepository>("UserRepository");
```
