# RSDI - Simple & Strong-Type Dependency Injection Container

[![npm version](https://img.shields.io/npm/v/rsdi.svg)](https://www.npmjs.com/package/rsdi)
[![CI](https://github.com/radzserg/rsdi/actions/workflows/ci.yml/badge.svg)](https://github.com/radzserg/rsdi/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/rsdi.svg)](./LICENSE)

Manage your dependencies with ease and safety. RSDI is a minimal, powerful DI container with full TypeScript support — no decorators or metadata required.

```typescript
import { DIContainer } from 'rsdi';

const container = new DIContainer()
  .add('config', () => loadConfig())
  .add('db', ({ config }) => new Database(config.dsn))
  .add('userRepository', ({ db }) => new UserRepository(db));

container.userRepository; // UserRepository — inferred, never cast
container.get('userRepository'); // the same instance: built once, then cached
container.userRepo; // compile error, not a runtime surprise
```

Your classes stay plain TypeScript — no decorators, no `reflect-metadata`, no base class to extend.
The container is the only thing that knows they fit together, and it knows their exact types.

> **Using an AI coding agent?** Point it at
> **[docs/ai-agent-guide.md](./docs/ai-agent-guide.md)** — a single-page integration guide covering
> the API, the mistakes that don't compile, how to structure a large container, and how to decode
> RSDI's error messages. Every example in it is compile- and runtime-verified.

## Motivation

Most DI libraries rely on reflect-metadata and decorators to auto-wire dependencies. But this tightly couples
your business logic to a framework — and adds complexity:

```typescript
@injectable()
class Foo {
  constructor(@inject('Database') private database?: Database) {}
}
// Notice how in order to allow the use of the empty constructor new Foo(),
// we need to make the parameters optional, e.g. database?: Database.
```

Why should your core logic even know it's injectable?

RSDI avoids this by using explicit factory functions — keeping your code clean, framework-agnostic, and easy to test.

[Read more on the reasoning behind this](https://radzserg.medium.com/https-medium-com-radzserg-dependency-injection-in-react-part-2-995e93b3327c)

## Features

- No decorators
- Strong TypeScript support
- Simple API
- No runtime dependencies
- Easy to mock and test
- Scales to large graphs — [compose](#compose) independent modules instead of one long chain

## Installation

```bash
npm install rsdi
# or
pnpm add rsdi
# or
yarn add rsdi
```

```typescript
import { DIContainer } from 'rsdi';
```

**Requirements.** The package is ESM-only and has zero runtime dependencies. Importing it from ESM
needs Node 16.9+ and nothing particular in `tsconfig.json`. Requiring it from CommonJS needs Node
20.19+ or 22.12+, and a TypeScript CommonJS consumer needs `"module": "nodenext"` — a CommonJS file
on `"Node16"` gets `TS1479`.

## When to use it

RSDI earns its place once an app has depth: controllers calling domain managers calling repositories
calling infrastructure, each layer needing whatever the one below it built. Wiring that by hand means
threading constructor arguments through every layer and rebuilding the whole chain in every test.

![architecture](https://github.com/radzserg/rsdi/raw/main/docs/RSDI_architecture.jpg 'RSDI Architecture')

Build the container once at your entry point and let each layer pull what it needs from it.

If your app is a handful of modules deep, you probably do not need a container yet — a few `new`
calls in `index.ts` are clearer, and RSDI will still be here when they stop being clearer.

## How it compares

Every library below is a good one; they disagree about what you should have to write.

| Library                                                 | Decorators | Runtime deps | How the resolved type is known           |
| ------------------------------------------------------- | ---------- | ------------ | ---------------------------------------- |
| **RSDI**                                                | no         | 0            | inferred from the factory's return type  |
| [typed-inject](https://github.com/nicojs/typed-inject)  | no         | 0            | inferred from the provider chain         |
| [Awilix](https://github.com/jeffijoe/awilix)            | optional   | 1            | from a `cradle` interface you maintain   |
| [InversifyJS](https://github.com/inversify/InversifyJS) | yes        | 3            | the type argument you pass to `get<T>()` |
| [tsyringe](https://github.com/microsoft/tsyringe)       | yes        | 1            | from the class token you resolve         |

_Checked against inversify 8, tsyringe 4, awilix 13, typed-inject 5._

**Pick a decorator-based container instead** if you want auto-wiring — annotate a constructor and
have the container work out what to pass it. RSDI deliberately cannot do that: it is what forces the
explicit factory, and the explicit factory is what makes the types exact and the classes framework-free.

**RSDI has little to offer plain JavaScript.** Most of its value is the compile-time half; without
TypeScript you get a small lazy service locator and none of the safety.

## How to use

### Registering and resolving

Two things are worth knowing before you write your first container.

**The second argument is always a function.** The container stores the factory, not the value, and
calls it the first time something asks for that dependency:

```typescript
const connection = await createConnection();

container.add('db', connection); // ✗ compile error — and InvalidResolverError at runtime
container.add('db', () => connection); // ✓
```

**Factories are synchronous.** `add('db', async () => …)` type-checks, but then `container.db` is a
`Promise` that every consumer has to await. Do the async work up front and register the settled
value, as above — [Async factory resolvers](./docs/async_factory_resolver.md) has the pattern for an
application entry point.

### Real-World Example

```typescript
// sample web application components

export function buildUserController(
  userRegistrator: UserRegistrator,
  userRepository: UserRepository,
) {
  return {
    async create(req: Request, res: Response) {
      const user = await userRegistrator.register(req.body);
      res.send(user);
    },
    async list(req: Request, res: Response) {
      const users = await userRepository.findAll(req.body);
      res.send(users);
    },
  };
}

export class UserRegistrator {
  public constructor(public readonly userRepository: UserRepository) {}

  public async register(userData: SignupData) {
    // validate and send sign up email
    return this.userRepository.saveNewUser(userData);
  }
}

export function buildDbUserRepository(db: DbConnection): UserRepository {
  return {
    async saveNewUser(userAccountData: SignupData): Promise<void> {
      await db('insert').insert(userAccountData);
    },
  };
}

export function buildDbConnection(): DbConnection {
  return connectToDb({/* db credentials */});
}
```

RSDI does not care what a dependency is — a class instance, an object returned by a factory
function, or a plain value. The example mixes them on purpose: classes where there is domain
behavior to test, factory functions where an interface has swappable implementations. PascalCase is
reserved for classes here, so anything named `buildX` is a plain call rather than a `new`.

Now let's configure the dependency injection container. Dependencies are only created when they're actually needed.
Your `configureDI` function will declare and connect everything in one place.

```typescript
import { DIContainer } from 'rsdi';

export type AppDIContainer = ReturnType<typeof configureDI>;

export default function configureDI() {
  return new DIContainer()
    .add('dbConnection', () => buildDbConnection())
    .add('userRepository', ({ dbConnection }) => buildDbUserRepository(dbConnection))
    .add('userRegistrator', ({ userRepository }) => new UserRegistrator(userRepository))
    .add('userController', ({ userRepository, userRegistrator }) =>
      buildUserController(userRegistrator, userRepository),
    );
}
```

When a resolver runs for the first time, its result is cached and reused for future calls.

By default, you should always use `.add()` to register dependencies — it throws if the name already exists, which
prevents accidental overwrites and keeps your setup predictable. If you need to replace an existing dependency —
usually in tests — use `.update()` instead. [Testing](#testing) covers that.

Both methods require a single literal name. Narrow a variable typed `'a' | 'b'` before passing it:
each call registers or replaces only one dependency.

`.update()` swaps an implementation, not a type. When the replacement is mutually assignable with
what is already registered, the container type passes through unchanged — so a test double cast
with `as any` leaves the dependency's real type intact for everything downstream, and a dependency
registered as `any` stays `any` however you update it. If you need to change a dependency's type,
change its `.add()`.

Let's map our web application routes to configured controllers

```typescript
// configure Express router
export default function configureRouter(app: core.Express, diContainer: AppDIContainer) {
  const { userController } = diContainer;
  app.route('/users').get(userController.list).post(userController.create);
}
```

Add `configureDI()` in your app's entry point:

```typescript
// express.ts
const app = express();

const diContainer = configureDI();
configureRouter(app, diContainer);

app.listen(8000);
```

That is the whole wiring — components, container, routes, entry point. For a longer walkthrough of
the same setup, see [Dependency injection in an Express application](https://radzserg.medium.com/dependency-injection-in-express-application-dd85295694ab).

## Testing

Swapping a real dependency for a fake is the main reason to reach for a container at all. `clone()`
gives each test its own container, and `update()` replaces a resolver inside it:

```typescript
const makeContainer = () =>
  configureDI()
    .clone()
    .update('userRepository', () => new InMemoryUserRepository());

test('registering a user stores it', async () => {
  const container = makeContainer();

  await container.userRegistrator.register({ email: 'grace@example.com' });

  expect(container.userRepository.saved).toHaveLength(1);
});
```

Two things make this pleasant in practice:

- **Nothing is built until it is asked for.** Overriding `userRepository` before the first
  resolution means the real one — and the database connection behind it — is never constructed.
  There is no separate "test container" to keep in sync with the real one.
- **`update()` throws if the name does not exist.** Rename a dependency in `src/` and the tests that
  stub it fail loudly, instead of quietly wiring the real thing back in.

## Strict types

`RSDI` uses TypeScript's type system to validate dependency trees at compile time, not runtime.

![strict type](https://github.com/radzserg/rsdi/raw/main/docs/RSDI_types.png 'RSDI types')

This gives you autocomplete and safety without decorators or metadata hacks.

## Advanced Usage

As your application grows, it's a good idea to split your DI container setup into smaller, focused modules. This keeps
your codebase easier to navigate and maintain.

A common pattern is to keep a main `diContainer.ts` file that configures the base container and delegate domain-specific
dependencies to separate files like `dataAccess.ts`, `validators.ts`, or `controllers.ts`.

This modular structure improves testability, readability, and clarity on how dependencies are wired across your app.

---

### Compose

`DIContainer.compose()` combines independently built containers into one new container. It is the recommended way to
wire a large dependency graph, and it keeps the inputs untouched.

```ts
// repositories.ts
export const repositories = new DIContainer().add('userRepository', () => new UserRepository());

// services.ts — declare what this module expects the composed container to provide
export const services = new DIContainer<{ userRepository: UserRepository }>().add(
  'userService',
  ({ userRepository }) => new UserService(userRepository),
);

// container.ts
const container = DIContainer.compose(repositories, services);

container.userService; // UserService — fully typed
```

Resolution stays lazy and happens against the composed container, so a factory may depend on names provided by any of
the composed modules. Only the _types_ of a module are limited to what that module declares — annotate the module (as
`services` does above) or use `.extend()` when you need another module's types to be visible while writing it.

If several containers define the same name, the last one wins at runtime — including over a value an
earlier container had already resolved. Be aware the _types_ intersect rather than overwrite, so the
same name registered with two different types resolves to `never` instead of the later type. That
surfaces the collision rather than hiding it; if a replacement is intentional, use `.update()`.

A conditional input keeps its alternatives in the result type. With
`DIContainer.compose(condition ? repositories : services)`, only dependencies shared by both
branches can be accessed without narrowing. The same rule applies to `merge()`.

#### Why compose instead of one long chain

Each `.add()` widens the container type, so a single chain of N dependencies costs **O(N²)** to type-check. Splitting
the graph into modules keeps each chain short, and the compiler only pays the quadratic within a module. Measured with
TypeScript 7 on this repo's benchmark (1600 dependencies, no factory arguments):

| Layout                         | Type instantiations | Check time |
| ------------------------------ | ------------------: | ---------: |
| one chain of 1600              |           7,815,223 |     90.2 s |
| 80 modules of 20, then compose |             361,552 |      0.9 s |

That is ~22× fewer instantiations and ~100× faster. If your editor feels sluggish in the file that wires your
container, this is usually why.

**Splitting alone is not the win — isolation is.** A module is only cheap if it is checked against the
dependencies it declares it consumes, as `services` does above. Threading the whole accumulated container
through each module measures no better than one flat chain. Write the seed as an explicit interface, too:
`Pick<FullContainer, 'a' | 'b'>` makes TypeScript normalise the entire map and couples the module back to the
whole graph. The [AI agent integration guide](./docs/ai-agent-guide.md) has the full pattern, and
[type-performance-plan.md](./docs/type-performance-plan.md) the measurements behind it.

---

### Extend

Use `.extend()` to layer modules onto a container. Each callback receives the container and
returns the next layer synchronously. Await resource initialization before starting the chain:

<!-- example:extend -->

```ts
import { DIContainer } from 'rsdi';

// database.ts
export type Pool = { query: (sql: string) => Promise<unknown[]> };

export const buildDatabaseDependencies = async (createPool: () => Promise<Pool>) => {
  const pool = await createPool();
  return new DIContainer().add('databasePool', () => pool);
};

// dataAccess.ts
type DIWithPool = Awaited<ReturnType<typeof buildDatabaseDependencies>>;

export const addDataAccessDependencies = (container: DIWithPool) =>
  container.add('userRepository', ({ databasePool }) => ({
    findAll: () => databasePool.query('SELECT * FROM users'),
  }));

// services.ts
type DIWithDataAccess = ReturnType<typeof addDataAccessDependencies>;

export const addServices = (container: DIWithDataAccess) =>
  container.add('userService', ({ userRepository }) => ({
    listUsers: () => userRepository.findAll(),
  }));

// diContainer.ts — pass your database driver's async pool initializer here
export const configureDI = async (createPool: () => Promise<Pool>) => {
  const container = await buildDatabaseDependencies(createPool);
  return container.extend(addDataAccessDependencies).extend(addServices);
};
```

The example is compiled and run in the test suite. Each section can live in its own module,
with the corresponding imports and exported container types.

> **`.extend()` chains do not scale indefinitely.** What makes the above convenient — each module's input
> being the previous module's output — is also what limits it, and naming that output with a type alias over
> `ReturnType<typeof …>` does not flatten it: every module's type stays nested inside the one before it. Past
> a handful of modules this shows up as a slow build, `TS2589`, or a container that collapses to `never`.
> When you get there, move the leaves to [`compose`](#compose) with an explicitly declared seed —
> `new DIContainer<{ databasePool: Pool }>()` — which is what actually cuts the chain.

---

### Merge

You can merge containers to combine their resolvers and resolved values. Unlike `compose`, `merge` mutates and returns
the container it is called on.

- Dependencies from all containers are preserved.
- If several define the same key, the last one takes precedence at runtime (and any value the
  replaced resolver had already produced is evicted). Types intersect, so a key defined twice with
  different types becomes `never`.
- Already resolved values are reused — not re-created.
- All-or-nothing: every incoming name is checked before anything is written, so a `merge` that throws leaves the
  container exactly as it was.

```ts
const containerA = new DIContainer().add('a', () => '1').add('bar', () => new Bar());

const containerB = new DIContainer().add('b', () => 'b').add('buzz', () => new Buzz('buzz'));

const finalContainer = containerA.merge(containerB);

console.log(finalContainer.a); // "1"
console.log(finalContainer.b); // "b"
console.log(finalContainer.bar instanceof Bar); // true
console.log(finalContainer.buzz.name); // "buzz"
```

`merge` accepts several containers at once, which avoids a long chain of merges:

```ts
const finalContainer = base.merge(repositories, services, controllers);
```

---

### Clone

Use `.clone()` to create a new container that shares resolvers and already resolved values with the original.

This is useful for creating isolated execution contexts while preserving the base setup.

```ts
const containerA = new DIContainer()
  .add('a', () => '1')
  .add('bar', () => new Bar())
  .add('buzz', () => new Buzz('buzz'));

const containerB = containerA.clone();

console.log(containerB.a); // "1"
console.log(containerB.bar instanceof Bar); // true
console.log(containerB.buzz.name); // "buzz"
```

---

### Naming your container type

Consumer files usually want to refer to the built container by name:

```ts
export type AppDIContainer = ReturnType<typeof configureDI>;
```

That works, but TypeScript still expands it in diagnostics, so a container with a few hundred dependencies produces
errors and hovers like `IDIContainer<{ a: string; } & { b: number; } & … }>`. Wrapping it in `SealedContainer` creates a
fresh alias that TypeScript prints by name instead:

```ts
import { type SealedContainer } from 'rsdi';

export type AppDIContainer = SealedContainer<ReturnType<typeof configureDI>>;

// error messages and hovers now say `AppDIContainer`
export function configureRouter(app: core.Express, container: AppDIContainer) {
  const { userController } = container; // still fully typed
}
```

The dependency types are unchanged — `container.userController` resolves exactly as before, and the container stays
chainable.

This is purely for readability. Referring to a container from another file is already cheap: in a 400-dependency graph,
50 consumer files add only ~2.6K type instantiations each, and naming the type costs about 3% _more_, not less. Reach
for it when your error messages get unreadable, not to speed up compilation — for that, see [Compose](#compose).

---

### API reference

| Call                           | Returns                               | Notes                                                       |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------------- |
| `.add(name, factory)`          | container + that name                 | Throws if `name` already exists                             |
| `.get(name)`                   | the dependency                        | Same as property access; resolved once, then cached         |
| `.update(name, factory)`       | container, name retyped               | Throws if `name` does **not** exist; drops the cached value |
| `.has(name)`                   | `boolean`                             | Is a resolver registered?                                   |
| `.hasResolvedDependency(name)` | `boolean`                             | Has it been _resolved_ yet?                                 |
| `DIContainer.compose(...cs)`   | a new container                       | Static; inputs untouched — see [Compose](#compose)          |
| `.merge(...containers)`        | the same container, mutated           | Later containers win — see [Merge](#merge)                  |
| `.clone()`                     | a new, independent container          | Copies resolvers and resolved values — see [Clone](#clone)  |
| `.extend(fn)`                  | whatever `fn` returns                 | For layered modules — see [Extend](#extend)                 |
| `.export()`                    | `{ resolvers, resolvedDependencies }` | Copies, for inspection in a test or debugger                |

A factory that destructures a name the container does not have throws `DependencyIsMissingError` naming
the factory that asked, rather than handing it `undefined` — so a module composed without one of its
dependencies fails at the first resolution instead of building a service around a hole.

```typescript
const container = new DIContainer().add('bar', () => new Bar());

container.has('bar'); // true
container.hasResolvedDependency('bar'); // false — not resolved yet

container.get('bar');
container.hasResolvedDependency('bar'); // true — now cached
```

### Errors

Every error the container throws is a class exported from the package, so it can be caught by type:

```typescript
import { DependencyIsMissingError, DIContainer } from 'rsdi';

try {
  container.get('nope');
} catch (error) {
  if (error instanceof DependencyIsMissingError) {
    // register it, or fall back
  }
}
```

| Class                         | Thrown by                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `DependencyIsMissingError`    | `get` or `update` on a name that isn't registered                                                |
| `DenyOverrideDependencyError` | `add` on a name that already exists — use `update`                                               |
| `ForbiddenNameError`          | a reserved name such as `get` or `merge`, or a name the container already has as an own property |
| `CircularDependencyError`     | Resolving a dependency that leads back to itself; names the path                                 |
| `InvalidResolverError`        | `add` or `update` given a value instead of a factory                                             |
| `InvalidContainerError`       | `merge` or `compose` given something that is not a container                                     |

Each sets `error.name` to its class, so logs read `DependencyIsMissingError: …` rather than `Error: …`.

The `deps` object a factory receives is read-only: register through the container, not through the
argument. `Object.freeze`, `seal` and `preventExtensions` on a container behave the way they do on any
object — see the [AI agent integration guide](./docs/ai-agent-guide.md) if you need the exact rules.

---

## Further reading

- **[AI agent integration guide](./docs/ai-agent-guide.md)** — one page an AI coding agent can read
  before wiring RSDI into a project: API reference, the mistakes that fail to compile, how to
  structure a large container, and how to decode each error.
- [Async factory resolvers](./docs/async_factory_resolver.md) — why factories are synchronous, and
  how to handle resources that need `await`.
- [DI container vs context](./docs/context_vs_container.md) — why the container stays at the
  composition root instead of being passed through your app.
- [Strict types](./docs/strict_types.md) — what the compiler catches for you.
- [Type-performance plan](./docs/type-performance-plan.md) — measurements behind the O(N²) chain
  cost and the composition guidance, for contributors.
- [Reading `pnpm bench:types`](./docs/type-benchmarks.md) — how to interpret the type-cost gate,
  for contributors.

Background articles by the author, hosted on Medium — useful context, but everything you need to use
RSDI is on this page and in the guides above:

- [Dependency injection in an Express application](https://radzserg.medium.com/dependency-injection-in-express-application-dd85295694ab)
- [Dependency injection in React](https://radzserg.medium.com/https-medium-com-radzserg-dependency-injection-in-react-part-2-995e93b3327c)
