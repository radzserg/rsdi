# RDI - Dependency Injection Container

# Getting Started

```typescript

import DIContainer, { object, get, value, factory, IDIContainer } from "rdi";

const config = {
    "ENV": value("PRODUCTION"),             // define raw value
    "Storage": object(CookieStorage),       // constructor without arguments    
    "AuthStorage": object(AuthStorage).construct(
       get("Storage")                       // refer to dependency described above       
    ),
    "BrowserHistory": factory(configureHistory),   
};
const container = new DIContainer();
container.addDefinitions(config);

const env = container.get<string>("ENV"); // PRODUCTION
const authStorage = container.get<AuthStorage>("AuthStorage");  // object of AuthStorage
const history = container.get<History>("BrowserHistory");  // object of History


function configureHistory(container: IDIContainer): History {     
    const history = createBrowserHistory();
    const env = container.get("ENV");
    if (env === "production") {
        // do what you need
    }
    return history;
}

```

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
