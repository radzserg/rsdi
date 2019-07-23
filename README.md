# RSDI - Dependency Injection Container

# Getting Started

```typescript

import DIContainer, { object, get, value, factory, IDIContainer } from "rsdi";

const config = {
    "ENV": value("PRODUCTION"),               // define raw value
    "AuthStorage": object(AuthStorage).construct(
       get("Storage")                         // refer to another dependency       
    ),
    "Storage": object(CookieStorage),         // constructor without arguments       
    "BrowserHistory": factory(configureHistory), // factory, returns singleton  
};
const container = new DIContainer();
container.addDefinitions(config);

function configureHistory(container: IDIContainer): History {
    // this factory will be called only once, during first resolving 
    // then resolved version will be returned 
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
