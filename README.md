# RSDI - Dependency Injection Container

# Getting Started

```typescript

import DIContainer, { object, get, factory, IDIContainer } from "rsdi";

const config = {
    "ENV": "PRODUCTION",               // define raw value
    "AuthStorage": object(AuthStorage).construct(
       get("Storage")                         // refer to another dependency       
    ),
    "Storage": object(CookieStorage),         // constructor without arguments       
    "BrowserHistory": factory(configureHistory), // factory (will be called only once)  
};
const container = new DIContainer();
container.addDefinitions(config);

function configureHistory(container: IDIContainer): History {
    const history = createBrowserHistory();
    const env = container.get("ENV");
    if (env === "production") {
        // do what you need
    }
    return history;
}

// in your code

const env = container.get<string>("ENV"); // PRODUCTION
const authStorage = container.get<AuthStorage>("AuthStorage");  // object of AuthStorage
const history = container.get<History>("BrowserHistory");  // History singleton will be returned
```

**All definitions are resolved once and their result is kept during the life of the container.** 


## Motivation 

Popular solution like `inversify` or `tsyringe` use `reflect-metadata` that allows to fetch argument types and based on 
that types and do autowiring. I like autowiring but the I don't like the means by which we achieve it. 
I don't like 
1. Those solutions in fact can deal only with typescript only. Since they rely on argument types that we don't have in JS.
2. I have to update my tsconfig because of one package. 
3. Let my components know about injections

```typescript
@injectable()
class Foo {  
}
```
Why component Foo should know that it's injectable?

More details thoughts in my [blog article](https://medium.com/@radzserg/https-medium-com-radzserg-dependency-injection-in-react-part-1-c1decd9c2e7a) 

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

When you specify raw values (i.e. don't use `object`, `factory` definitions) `rsdi` will resolve as it is. 

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
constructor, you can use `constructor` method. You can refer to the existing definitions via `get` helper. 
If you need to call object method after initialization you can use `method` it will be called after constructor. You also 
can refer to the existing definitions via `get` method.

### Factory definition

You can use factory definition when you need more flexibility during initialisation. `container: IDIContainer` will be
pass as an argument to the factory method. 

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