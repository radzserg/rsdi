# Changelog

# 3.4.0

A hardening release: several things that used to fail silently now fail loudly, and a few that used
to compile no longer do. Three changes can break existing code despite the minor version — they are
the first three entries under **Changed**.

## Added

- Every error the container throws is now exported from the package entry point, so it can be caught
  by type: `DependencyIsMissingError`, `DenyOverrideDependencyError`, `ForbiddenNameError`,
  `CircularDependencyError`, `InvalidResolverError` and `InvalidContainerError`. Each sets
  `error.name` to its class, so logs read `DependencyIsMissingError: …` rather than `Error: …`.
- Resolving a dependency that leads back to itself throws `CircularDependencyError` naming the path
  (`a -> b -> a`), instead of exhausting the call stack.
- `add` or `update` given a value where a factory belongs throws `InvalidResolverError` at
  registration rather than failing later.
- `merge` or `compose` given something that is not a container throws `InvalidContainerError` naming
  the argument position.
- `ContainerSnapshot` — the return type of `export()` — is exported.

## Fixed

- A factory destructuring a name the container does not have now throws `DependencyIsMissingError`
  naming the factory that asked. It previously received `undefined` and built its service around the
  hole, which surfaced far from the cause.
- A dependency whose factory returns `undefined` is now cached. It previously re-ran its factory on
  every access.
- A dependency named after an `Object.prototype` member resolves to its own value. `add('toString',
…)` previously handed back the inherited function.
- Reserved container method names are rejected at compile time. `add('get', …)` used to type-check
  and then shadow the method.
- `merge` is all-or-nothing: every incoming name is checked before anything is written, so a refused
  merge leaves the container exactly as it was instead of half-merged.
- `update` called while the name's own factory is running no longer caches the superseded value.

## Changed

- **`clone()` returns `IDIContainer<R>` rather than `DIContainer<R>`.** `const c: DIContainer<X> =
container.clone()` stops compiling — annotate with `IDIContainer<X>` or `SealedContainer<…>`.
- **The protected `resolvers`, `resolvedDependencies` and `setResolvers` members are gone.** A
  subclass that reached for them breaks; the container's internals now live behind a symbol.
- **The dependencies object a factory receives is read-only.** Assigning to it, deleting from it,
  freezing it or changing its prototype throws a `TypeError`. Register through the container, not
  through the `deps` argument.
- `Object.freeze`, `seal` and `preventExtensions` on a container are honoured with their platform
  meaning: sealing forbids new dependencies, freezing also forbids replacing a resolver. Resolution
  is never refused, and `clone()` returns a fresh, unlocked container.
- Some operations pay for the checks above. Resolving an already-cached dependency goes from roughly
  15ns to 21ns, `update` is about 60% slower per call, and a `merge` onto names the container
  already holds is roughly 3x slower, since every incoming name is validated before anything is
  written. If your workload merges or updates in a hot path, that is the trade.
- Type-checking got cheaper in every measured shape — a long `update()` override chain by 18%, a
  domain module on a large container by 5%.

# 3.3.0

## Fixed

- A long chain of `update()` overrides no longer trips `TS2589`. On a 300-key container it
  previously started erroring at 50 chained calls — a length a test harness reaches when it
  overrides one service per test. Harnesses working around it with `@ts-expect-error` or
  `const container: any` can drop those suppressions. Inference is unchanged, including narrowing
  when a dependency is replaced with a subtype.

## Changed

- Building a container is now linear rather than quadratic. Wiring 1600 dependencies takes 0.6 ms
  rather than 196 ms, and a 200-dependency chain is roughly 10x faster. Resolving an
  already-cached dependency is 2-4x faster on large containers.
- `clone()` is roughly 35% slower — the cost of the copy that makes the above safe. It is a
  setup-time operation where `add` and `get` are paid on every use, but if your workload clones
  large containers in a hot path, that is the trade.
- `export()` now returns copies of both maps. Previously the returned `resolvedDependencies` kept
  reflecting resolutions that happened after the call.

# 3.2.1

Added `repository` and `bugs` metadata so the relative links in the README (including the AI agent
guide) resolve correctly on npmjs.com. No code changes.

# 3.2.0

## Added

- `DIContainer.compose(...containers)` — builds a new container from independently built ones,
  leaving the inputs untouched. Splitting a large graph into modules and composing them is far
  cheaper to type-check than one long `add` chain.
- `merge(...containers)` now accepts any number of containers; existing single-container calls are
  unchanged.
- `SealedContainer<C>` and `ResolversOf<C>` types are now exported, for naming a built container in
  hovers and error messages and for extracting its resolver map.

## Fixed

- `merge`/`compose` now clear a stale cached value when a later container overrides a name.
  Previously an already-resolved dependency kept returning the earlier instance, contradicting
  last-writer-wins.
- A dependency named `export` no longer breaks `merge`/`compose`. `export` is now a reserved name
  and is rejected at registration, like the other container methods.

# 3.1.0

## Added

- `clone()` — returns a new container carrying the same resolvers.
- `hasResolvedDependency(name)` — whether a dependency has already been resolved, as opposed to
  `has(name)`, which reports whether a resolver is registered.

## Fixed

- `update()` now clears the cached value for the name it replaces. Previously it kept returning the
  stale instance if the dependency had already been resolved.

# 3.0.5

Added `merge` and `clone` method to `DIContainer` class.

# 3.0.0

The major release of rsdi version 3.0.0 introduces a revamped API that brings several improvements. The new API aims
to simplify usage and enhance intuitiveness. It offers better type support and more informative error messages. While
rsdi 2.0.0 focused on unifying the declarative syntax, the 3.0.0 version prioritizes stricter type checks, ensuring
more robust dependency injection functionality.

# 2.1.0

## Changed

- Adds function resolver

# 2.0.0

## Changed

- Introduced more strict type checks
