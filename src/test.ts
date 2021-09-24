// your classes
import DIContainer, { factory, IDIContainer, object, use } from "./index";

class CookieStorage {}
class AuthStorage {
    constructor(storage: CookieStorage) {}
}
class Logger {}
class DummyLogger extends Logger {}



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
