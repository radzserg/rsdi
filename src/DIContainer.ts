import {
  CircularDependencyError,
  DenyOverrideDependencyError,
  DependencyIsMissingError,
  ForbiddenNameError,
  InvalidResolverError,
} from './errors.js';
import {
  type ContainerLike,
  type ContainerSnapshot,
  type DenyInputKeys,
  type Factory,
  type IDIContainer,
  type InternalState,
  type MergedResolvers,
  type ReservedName,
  type ResolvedDependencies,
  type ResolvedDependencyValue,
  type ResolvedValues,
  type Resolvers,
  type StringLiteral,
  type UpdatedResolvers,
} from './types.js';

// All of the container's state lives behind this one symbol, in a plain object; the helpers that
// work on it are `static`. Two things follow, and both are the point. A dependency can never
// collide with an internal — `resolvers` and `setResolver` are ordinary dependency names — so
// nothing non-public has to be reserved, and `ReservedName` in types.ts is simply
// `keyof DIContainer<{}>` with no hand-kept list to drift. And a factory cannot reach the state by
// accident through the deps object: `deps.resolvers` used to hand back the live map, a back door
// under every check `add` performs — a resolver injected there had no name check, no function check
// and no getter — and the proxy's `ownKeys` trap hides the symbol, so it is not enumerable either.
//
// `Symbol.for`, not `Symbol()`: `merge` and `compose` read another container's state by this key,
// and two copies of rsdi in one dependency tree must still be able to compose each other's
// containers, as they could when the fields were string-keyed. A registry symbol is the same
// symbol in every copy. The price is that `Symbol.for('rsdi.internalState')` is a known key — so
// this is not a security boundary, and was never meant as one; TypeScript's `protected` says who
// may use it, and nothing in JavaScript short of `#private` fields, which break `this` through the
// proxy, hides state from a caller who is determined to reach it.
//
// Exported for the tests, which need the maps to assert identity across writes. It is not
// re-exported from index.ts, and the `exports` map blocks the deep import.
export const INTERNAL_STATE: unique symbol = Symbol.for('rsdi.internalState');

/**
 * Dependency injection container
 */
export class DIContainer<ContainerResolvers extends ResolvedDependencies = {}> {
  // The only field. Built by a static so the proxy handler can be written once, and `readonly`
  // because the object never changes shape: its maps are written into, never replaced, which is
  // also what keeps a chain of `add` calls linear (see `setResolver`).
  protected readonly [INTERNAL_STATE]: InternalState<ContainerResolvers> =
    DIContainer.createState(this);

  /**
   * Combines independently built containers into a single new container.
   *
   * This is the recommended way to wire a large dependency graph. Splitting the graph
   * into modules and composing them is dramatically cheaper to type-check than one long
   * `add` chain, because each module chain is type-checked against its own small
   * resolver map instead of the ever-growing combined one:
   *
   * // repositories.ts
   * export const repositories = new DIContainer().add('userRepository', () => new UserRepository());
   * // services.ts
   * export const services = new DIContainer().add('mailer', () => new Mailer());
   * // container.ts
   * const container = DIContainer.compose(repositories, services);
   *
   * Factories may depend on names provided by any of the composed containers — resolution
   * happens lazily against the composed container, so cross-module dependencies work at
   * runtime. Only the *types* of a module are limited to what that module declares; when a
   * module needs another module's dependencies to be visible at compile time, layer them
   * with `extend` instead. A name no composed module provides throws
   * `DependencyIsMissingError` at resolution, naming the factory that asked for it.
   *
   * The inputs are left untouched: the composed container is a new instance.
   *
   * When several containers define the same name the last one wins at runtime, including
   * over a value the earlier container had already resolved. Note the types intersect rather
   * than overwrite, so a name defined twice with *different* types resolves to `never` — a
   * deliberate signal, since a scalable last-writer-wins type fold has to recurse per
   * container and trips TypeScript's depth limiter at ~50 of them. Prefer `update()` when a
   * replacement is intentional.
   * @param containers
   */
  public static compose<T extends readonly ContainerLike[]>(
    ...containers: T
  ): IDIContainer<MergedResolvers<T>> {
    return new DIContainer().merge(...containers) as IDIContainer<MergedResolvers<T>>;
  }

  /**
   * Seeds a fresh container with copies of another's maps — what `clone()` does through
   * `ClonedDiContainer`. `protected` so a subclass constructor can call it; a consumer's
   * subclass may want to as well.
   */
  protected static seedResolvers<CR extends ResolvedDependencies>(
    container: DIContainer<CR>,
    resolvers: Resolvers<CR>,
    resolvedDependencies: ResolvedValues<CR>,
  ): void {
    const state = container[INTERNAL_STATE];

    // A plain `Error` on purpose, where every other throw in this file is a typed class. Those are
    // conditions a consumer can reach through the public API and may want to catch; this one is
    // reachable only from a subclass constructor and is a programming error at wiring time, not a
    // runtime state. Exporting a class for it would widen the public surface for nothing.
    if (Object.keys(state.resolvers).length !== 0) {
      throw new Error('Cannot set resolvers on a container that already has resolvers');
    }

    // Both maps are copied, not adopted. `add` and `merge` write into them in place, so a clone
    // that kept its source's map would leak every later registration back into it.
    //
    // Entry by entry rather than by spread: these maps are built a key at a time, which leaves
    // them in V8's dictionary mode, and spreading one of those costs over twice what the loop does.
    const ownResolvers = state.resolvers as Record<string, Factory<CR>>;
    const source = resolvers as Record<string, Factory<CR>>;
    for (const name of Object.keys(source)) {
      // Getter before resolver, as in `setResolver`; see `addContainerProperty`.
      DIContainer.addContainerProperty(container, name);
      ownResolvers[name] = source[name];
    }

    const ownResolvedDependencies = state.resolvedDependencies as Record<
      string,
      ResolvedDependencyValue
    >;
    for (const name of Object.keys(resolvedDependencies)) {
      ownResolvedDependencies[name] = resolvedDependencies[name];
    }
  }

  /**
   * Wires `container[name]` to `get(name)`. Called before the resolver is written, so that an own
   * property already under the name can be told apart: if the name has a resolver, the property is
   * the getter this method installed earlier — `update`, or `merge` of a name already held — and
   * there is nothing to do. If it has none, something else put that property there: a consumer
   * assignment, a subclass field, a factory writing through the deps object. Defining nothing and
   * carrying on used to leave the name half-working — `get(name)` ran the factory while
   * `container.name` returned the stray — so it is refused instead, before anything is written.
   */
  private static addContainerProperty<CR extends ResolvedDependencies>(
    container: DIContainer<CR>,
    name: string,
  ): void {
    if (Object.hasOwn(container, name)) {
      if (container.has(name)) {
        return;
      }

      throw new ForbiddenNameError(name, FOREIGN_OWN_PROPERTY);
    }

    Object.defineProperty(container, name, {
      get() {
        return this.get(name);
      },
    });
  }

  /**
   * The checks a name has to pass before it can be registered, apart from whether it already is
   * one: not a container member, and not already an own property that something else put on the
   * container. `merge` runs it for every incoming name of every container before writing anything,
   * which is what makes it all-or-nothing. `add` and `update` check the reserved half inline and
   * leave the other to `addContainerProperty`, which has to look at the own property regardless.
   */
  private static assertNameAvailable<CR extends ResolvedDependencies>(
    container: DIContainer<CR>,
    name: string,
  ): void {
    if (containerMembers.has(name)) {
      throw new ForbiddenNameError(name);
    }

    if (Object.hasOwn(container, name) && !container.has(name)) {
      throw new ForbiddenNameError(name, FOREIGN_OWN_PROPERTY);
    }
  }

  /**
   * Builds the state object for a new container. Static so the proxy handler is written once;
   * the traps read the state back off the target at call time, so nothing here depends on
   * construction order.
   *
   * The proxy is what factories receive. Reads forward to the container, whose dependency getters
   * do the resolving — and a read of a name the container does not have throws instead of yielding
   * `undefined`. That is the whole reason the proxy exists: forwarding alone is what `this` already
   * does, and measured the same. The case it guards is the one the types cannot see — a module's
   * factory destructuring a name another module provides, composed without that module. Without
   * the trap that factory silently built its service around `undefined`.
   *
   * The `in` test walks the prototype chain on purpose: `toString`, `constructor`, and the
   * container's own methods are all reachable through the context, as they are on the container.
   * Anything that probes a protocol key the container lacks — `then` from `await deps`, `toJSON`
   * from `JSON.stringify(deps)` — throws; neither is a supported use of the context.
   *
   * Writes are refused outright. The proxy's target is the container, so `deps.scratch = 42`
   * inside a factory used to land as an own property on the container itself — invisible until a
   * later `add('scratch', …)` was refused for colliding with it — and `deps.a = 2` on a dependency
   * name failed with V8's own message about a getter-only property. A `TypeError`, as for a frozen
   * object, naming the key and the factory that was running. Only a write pays for the traps.
   *
   * The state is symbol-keyed and `ownKeys` leaves symbols out, so the deps object shows a factory
   * nothing but dependencies and the public methods: `deps.resolvers` is an unknown name like any
   * other, and `Object.getOwnPropertySymbols(deps)` is empty. Symbol *reads* still forward — the
   * container's own methods reach their state through `this`, which is the proxy when a factory
   * calls `deps.has('a')`. Omitting configurable keys from `ownKeys` is within the proxy
   * invariants; the dependency getters are the only non-configurable own properties, and they
   * are strings.
   */
  private static createState<CR extends ResolvedDependencies>(
    container: DIContainer<CR>,
  ): InternalState<CR> {
    const context = new Proxy(container, {
      defineProperty(target, property) {
        throw readOnlyContext(property, target[INTERNAL_STATE].resolving);
      },
      deleteProperty(target, property) {
        throw readOnlyContext(property, target[INTERNAL_STATE].resolving);
      },
      get(target, property) {
        // Indexing with the key as given: `toString()` here cost a call on every dependency a
        // factory destructures, and turned a symbol lookup into a miss under its description.
        const value = target[property as keyof DIContainer<CR>];
        if (value === undefined && typeof property === 'string' && !(property in target)) {
          throw new DependencyIsMissingError(property, [...target[INTERNAL_STATE].resolving]);
        }

        return value;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target).filter((key) => typeof key === 'string');
      },
      set(target, property) {
        throw readOnlyContext(property, target[INTERNAL_STATE].resolving);
      },
    }) as unknown as CR;

    // Both maps are null-prototype. `get()` reads them with plain property lookups — the cheapest
    // thing on the hot path — so with an ordinary `{}` a dependency named after an
    // `Object.prototype` member resolved to the inherited function: `add('toString', () => 'a
    // value')` registered fine and then handed back `[Function: toString]`, because `'toString' in
    // resolvedDependencies` was true. Guarding each lookup with `Object.hasOwn` would fix it and
    // tax every cache hit; removing the prototype fixes it and taxes nothing. These maps are built
    // a key at a time and so live in V8's dictionary mode either way, which is why the change is
    // free. `export()` still hands out ordinary objects — its copies are for consumers, not lookup.
    //
    // `resolving` holds the names whose factory is running right now, in call order, so a factory
    // that reaches back to a name above it in the chain is reported as `a -> b -> a` instead of
    // dying in `RangeError: Maximum call stack size exceeded` with nothing named. Only a cache miss
    // touches it — a hit returns before it is consulted — so cached resolution costs what it did.
    return {
      context,
      resolvedDependencies: Object.create(null) as ResolvedValues<CR>,
      resolvers: Object.create(null) as Resolvers<CR>,
      resolving: new Set<string>(),
    };
  }

  /**
   * Stores a resolver under `name` and wires the property getter for it. Shared by `add` and
   * `update`; the name checks belong to the callers.
   */
  private static setResolver<CR extends ResolvedDependencies>(
    container: DIContainer<CR>,
    name: string,
    resolver: Factory<CR>,
  ): void {
    assertResolver(name, resolver);

    // The getter first: it decides whether an own property under `name` is ours by asking whether a
    // resolver exists, so the resolver must not exist yet for a new name. It also means a refused
    // name leaves the container exactly as it was.
    DIContainer.addContainerProperty(container, name);

    // Writing into the map rather than rebuilding it is what makes a chain of `add` calls linear
    // instead of quadratic. It is safe only because no two containers ever share a resolver map —
    // `seedResolvers` copies what `clone()` hands it, which `clone.test.ts` pins.
    (container[INTERNAL_STATE].resolvers as Record<string, Factory<CR>>)[name] = resolver;
  }

  /**
   * Registers a factory under `name`. The factory runs once, on the first `get(name)` or
   * `container.name`, and its result is cached; it receives the container, so it can destructure
   * the dependencies it needs and they resolve lazily at that point.
   *
   * Throws `DenyOverrideDependencyError` if the name is already registered — use `update` to
   * replace on purpose — `ForbiddenNameError` if the name is a container member, and
   * `InvalidResolverError` if `resolver` is not a function. The first two are also compile
   * errors: a registered or reserved name types the parameter as `never`.
   *
   * Returns the same container with `name` added to its type, so the calls chain.
   * @param name an inline string literal; a widened `string` is rejected at compile time
   * @param resolver a function of the container's dependencies to the value
   */
  public add<N extends string, V>(
    name: StringLiteral<DenyInputKeys<N, keyof ContainerResolvers | ReservedName>>,
    resolver: Factory<ContainerResolvers, V>,
  ): IDIContainer<ContainerResolvers & { [n in N]: V }> {
    // Only the reserved half of `assertNameAvailable` here: the foreign-own-property half is what
    // `addContainerProperty` checks anyway, before anything is written, and doing it twice cost the
    // `wiring.bench.ts` add chain a measurable slice for nothing.
    if (containerMembers.has(name)) {
      throw new ForbiddenNameError(name);
    }

    if (this.has(name)) {
      throw new DenyOverrideDependencyError(name);
    }

    DIContainer.setResolver(this, name, resolver);

    return this as unknown as IDIContainer<ContainerResolvers & { [n in N]: V }>;
  }

  /**
   * Creates a new container instance with the same resolvers.
   *
   * Useful when you want to share a base container across different modules.
   * For example, you can define a base container with shared dependencies,
   * then clone it to create separate DI configurations for different bounded contexts.
   *
   * The cloned container is a new instance but retains all the original resolvers.
   *
   * Typed as `IDIContainer`, like every other method that hands the container back, so property
   * access stays typed on the result. `DIContainer<R>` alone does not intersect the resolver map —
   * on a subclass instance `clone().foo` was a `TS2339` while `IDIContainer` said it existed.
   */
  public clone(): IDIContainer<ContainerResolvers> {
    // Handed the live maps on purpose — `seedResolvers` is what copies them, and routing this
    // through `export()` would only allocate a second copy to throw away.
    const { resolvedDependencies, resolvers } = this[INTERNAL_STATE];
    const newContainer = new ClonedDiContainer(resolvers, resolvedDependencies);

    return newContainer as unknown as IDIContainer<ContainerResolvers>;
  }

  /**
   * Returns the container's resolvers and its already-resolved values.
   *
   * Both maps are copies. `add`, `update` and `merge` write into the internal maps in place, so
   * handing out the live objects would let a caller both observe registrations made after the
   * call and mutate the container by writing into what they were given. Nothing inside the class
   * goes through here — `clone` and `merge` read the state directly — so the copy is paid only by
   * a consumer that asks for it.
   *
   * Declared on `IDIContainer` as well, so it stays reachable after `add` has widened the type.
   */
  public export(): ContainerSnapshot<ContainerResolvers> {
    const { resolvedDependencies, resolvers } = this[INTERNAL_STATE];

    return {
      resolvedDependencies: { ...resolvedDependencies },
      resolvers: { ...resolvers },
    };
  }

  /**
   * Passes the container to `diConfigurationFactory` and returns whatever it returns. This is how
   * a module layers on top of an earlier one when its factories need the earlier dependencies to
   * be visible at compile time — `compose` combines modules but keeps each module's types to
   * itself.
   *
   * // validators.ts
   * export const addValidators = (container: DIWithDataAccessors) =>
   *   container
   *     .add('validatorA', ({ a, b }) => new ValidatorA(a, b))
   *     .add('validatorB', ({ a, c }) => new ValidatorB(a, c));
   *
   * // container.ts
   * const container = dataAccessors.extend(addValidators);
   *
   * Give module functions an explicit return type when chaining several; `docs/ai-agent-guide.md`
   * explains why `ReturnType<typeof previousModule>` accumulates depth.
   * @param diConfigurationFactory receives this container, typed with its current dependencies
   */
  public extend<E extends (container: IDIContainer<ContainerResolvers>) => IDIContainer>(
    diConfigurationFactory: E,
  ): ReturnType<E> {
    return diConfigurationFactory(
      this as unknown as IDIContainer<ContainerResolvers>,
    ) as ReturnType<E>;
  }

  /**
   * Resolves a dependency by name. `container.name` and destructuring the container are the same
   * call. The factory runs on the first request and the value is cached; a cache hit is one map
   * lookup.
   *
   * Throws `DependencyIsMissingError` if nothing is registered under the name and
   * `CircularDependencyError` if resolving it leads back to itself; both messages carry the
   * resolution path when the request came from inside a factory.
   * @param dependencyName a registered name
   */
  public get<Name extends keyof ContainerResolvers>(
    dependencyName: Name,
  ): ContainerResolvers[Name] {
    // One load of the state object per call; everything below reads from it. A factory is allowed
    // to produce `undefined`, and that value has to be cached like any other, or the factory
    // re-runs on every access while `hasResolvedDependency` reports it resolved. The `in` test is
    // what makes that case a hit — on a null-prototype map it is an own-key check with nothing to
    // walk — but it is reached only when the read came back `undefined`. Testing `in` first, for
    // every call, made a cache hit two dictionary lookups instead of one and cost the
    // `resolve.bench.ts` cached rows a third of their throughput. A miss pays the extra test once,
    // against the factory it is about to run.
    const state = this[INTERNAL_STATE];
    const resolved = state.resolvedDependencies[dependencyName];
    if (resolved !== undefined || dependencyName in state.resolvedDependencies) {
      return resolved;
    }

    const resolver = state.resolvers[dependencyName];
    if (!resolver) {
      throw new DependencyIsMissingError(dependencyName as string, [...state.resolving]);
    }

    const name = dependencyName as string;
    if (state.resolving.has(name)) {
      throw new CircularDependencyError([...state.resolving, name]);
    }

    state.resolving.add(name);
    let value: ResolvedDependencyValue;
    try {
      value = resolver(state.context);
    } finally {
      // Released on a throw as well, or a factory that failed once would report a cycle forever.
      state.resolving.delete(name);
    }

    state.resolvedDependencies[dependencyName] = value;

    return value;
  }

  /**
   * Whether a resolver is registered under `name`, resolved or not. Takes any string, so it can
   * probe a name the type does not know about.
   * @param name
   */
  public has(name: string): boolean {
    return Object.hasOwn(this[INTERNAL_STATE].resolvers, name);
  }

  /**
   * Whether `name` has been resolved and cached. `false` for a registered name nothing has asked
   * for yet, and again after `update` replaces its resolver. Takes any string, like `has`.
   * @param name
   */
  public hasResolvedDependency(name: string): boolean {
    return Object.hasOwn(this[INTERNAL_STATE].resolvedDependencies, name);
  }

  /**
   * Merges other containers into this one. Resolved dependencies are merged as well.
   *
   * Accepts any number of containers, so a set of independently built modules can be
   * combined in a single call:
   *
   * base.merge(repositories, services, controllers)
   *
   * Combining modules this way is also much cheaper to type-check than one long
   * `add` chain — see docs/type-performance-plan.md.
   *
   * When several containers define the same name the last one wins at runtime, including over
   * an already-resolved value. The types intersect rather than overwrite, so the same name with
   * two different types resolves to `never` rather than the later type.
   *
   * This mutates and returns `this`; use `clone()` or the static `DIContainer.compose()`
   * when a separate instance is required. Every incoming name is checked before anything is
   * written, so a merge that throws leaves this container exactly as it was.
   * @param containers
   */
  public merge<T extends readonly ContainerLike[]>(
    ...containers: T
  ): IDIContainer<ContainerResolvers & MergedResolvers<T>> {
    const own = this[INTERNAL_STATE];
    const ownResolvers = own.resolvers as Record<string, Factory<ContainerResolvers>>;
    const ownResolvedDependencies = own.resolvedDependencies as Record<
      string,
      ResolvedDependencyValue
    >;

    // Two passes, so that a merge is all-or-nothing like `add`. Checking and writing one name at a
    // time left the earlier containers, and the earlier names of the failing one, merged into
    // `this` when a later name was refused — including a cache eviction that could not be undone.
    // The key arrays are read once and reused, so the second pass costs no extra allocation.
    //
    // `add` and `update` refuse these names, so a real container never carries one — but `merge`
    // accepts anything shaped like a container at runtime, and an own property named `get` would
    // shadow the method: `container.get` becomes a getter that calls `this.get`, and the first
    // resolution dies in a stack overflow. One Set lookup per incoming name keeps the failure a
    // `ForbiddenNameError`, and keeps merge linear.
    const incoming = containers.map((otherContainer, index) => {
      // The types only admit containers; this is for JavaScript consumers and `any` casts, who
      // otherwise got `Cannot convert undefined or null to object` from deep inside the loop — for
      // an `undefined` from a mistyped import, or a plain object that used to pass as a container
      // when the fields were string-keyed.
      if (!isContainer(otherContainer)) {
        throw new TypeError(
          `merge expects containers; argument ${index + 1} is ${describe(otherContainer)}`,
        );
      }

      // The state directly, not `export()`: that copies now, and every name is copied again into
      // our own maps below — one throwaway map per merged container, for nothing.
      const { resolvedDependencies: newResolvedDependencies, resolvers: newResolvers } = (
        otherContainer as DIContainer<ResolvedDependencies>
      )[INTERNAL_STATE];
      const names = Object.keys(newResolvers);

      for (const name of names) {
        DIContainer.assertNameAvailable(this, name);
        assertResolver(name, (newResolvers as Record<string, unknown>)[name]);
      }

      return { names, newResolvedDependencies, newResolvers };
    });

    for (const { names, newResolvedDependencies, newResolvers } of incoming) {
      for (const name of names) {
        // A replaced resolver must not keep the value the previous one produced — the same
        // eviction `update()` performs. Only the overriding container's own cache may survive,
        // so a name it re-registers without having resolved yet has to lose the old value;
        // otherwise `merge`/`compose` return the earlier container's instance from a resolver
        // that no longer exists, silently contradicting last-writer-wins.
        //
        // Our own cache is tested first so that merging into a container that has resolved
        // nothing — the `compose` case — issues no deletes at all.
        if (
          Object.hasOwn(ownResolvedDependencies, name) &&
          !Object.hasOwn(newResolvedDependencies, name)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete ownResolvedDependencies[name];
        }

        // Only the incoming names can be new, so this replaces a rescan of the whole merged map.
        DIContainer.addContainerProperty(this, name);

        // Writing into the map rather than rebuilding it per container is what keeps
        // `compose(...modules)` linear in total dependencies instead of quadratic.
        ownResolvers[name] = (newResolvers as Record<string, Factory<ContainerResolvers>>)[name];
      }

      for (const name of Object.keys(newResolvedDependencies)) {
        ownResolvedDependencies[name] = newResolvedDependencies[name];
      }
    }

    return this as unknown as IDIContainer<ContainerResolvers & MergedResolvers<T>>;
  }

  /**
   * Replaces the resolver registered under `name` and evicts its cached value, so the next request
   * runs the new factory. Throws `DependencyIsMissingError` if the name is not registered — `add`
   * is for new names, and keeping the two apart is what stops a dependency being redefined by
   * accident. The usual reason to call this is a test double.
   *
   * Chaining overrides off a built container is a supported shape and stays cheap: when
   * the replacement has the same type as the dependency it replaces — a test double for
   * the real service — the container type passes through unchanged, so the chain costs
   * the same at 60 links as at 20. See `UpdatedResolvers` in `types.ts`.
   * @param name
   * @param resolver
   */
  public update<N extends keyof ContainerResolvers, V>(
    name: StringLiteral<N>,
    resolver: Factory<ContainerResolvers, V>,
  ): IDIContainer<UpdatedResolvers<ContainerResolvers, N, V>> {
    if (containerMembers.has(name)) {
      throw new ForbiddenNameError(name);
    }

    if (!this.has(name)) {
      throw new DependencyIsMissingError(name);
    }

    DIContainer.setResolver(this, name, resolver);
    const { resolvedDependencies } = this[INTERNAL_STATE];
    if (Object.hasOwn(resolvedDependencies, name)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete resolvedDependencies[name];
    }

    return this as unknown as IDIContainer<UpdatedResolvers<ContainerResolvers, N, V>>;
  }
}

// The types already reject a non-function resolver; this is for JavaScript consumers and `any`
// casts, who otherwise found out at first `get` — `TypeError: resolver is not a function`, far
// from the registration and naming no dependency — or, for `null`, got a `DependencyIsMissingError`
// for a name they had registered. Registration-time only, so the resolve path pays nothing.
// `merge` runs it too, since a duck-typed input bypasses `add`.
function assertResolver(
  name: string,
  resolver: unknown,
): asserts resolver is Factory<ResolvedDependencies> {
  if (typeof resolver !== 'function') {
    throw new InvalidResolverError(name, resolver);
  }
}

function describe(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'function') {
    return 'a function';
  }

  if (typeof value !== 'object') {
    return `a ${typeof value}`;
  }

  const name = (value as object).constructor?.name;

  return name && name !== 'Object' ? `an instance of ${name}` : 'a plain object';
}

// Structural, not `instanceof`: a container from another copy of rsdi is still a container, and the
// registry symbol above is what makes that true.
//
// `boolean`, not a `value is DIContainer<…>` type guard, on purpose. The guard read better, and
// cost 2,097 type instantiations in every `bench-types` scenario — narrowing the argument makes the
// compiler relate the whole class type inside `merge`, and on the smallest scenario that was 11% of
// the budget. `merge` already casts, so the narrowing bought nothing.
function isContainer(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<symbol, unknown>)[INTERNAL_STATE] === 'object'
  );
}

const FOREIGN_OWN_PROPERTY =
  'the container already has an own property with this name that is not a dependency';

// A built-in `TypeError` rather than an exported class, as for writing to a frozen object: this is a
// bug in a factory, not a runtime condition a consumer catches. The types do not say `Readonly`;
// `Factory` in types.ts explains what that measured.
function readOnlyContext(property: string | symbol, resolving: ReadonlySet<string>): TypeError {
  const key = typeof property === 'symbol' ? property.toString() : property;
  const where = resolving.size === 0 ? '' : ` while resolving ${[...resolving].join(' -> ')}`;

  return new TypeError(
    `The dependencies object passed to a factory is read-only; cannot write ${key}${where}`,
  );
}

// Derived from the class rather than hand-listed: the list is only correct if it is exactly the
// class's own members, and a missing entry is not a compile error anywhere — `export` was absent
// until a dependency of that name was found to break every `merge`.
//
// Only the prototype's string keys, which is to say the public methods and `constructor`.
// `addContainerProperty` defines dependencies as *own* properties, which shadow the methods the
// class calls through `this` — so those names must be reserved. Everything non-public is either
// behind the `INTERNAL_STATE` symbol or a static, neither of which a string own property can
// shadow, so there is nothing else to reserve: no throwaway instance for fields, no private method
// names, and the type-level `ReservedName` is `keyof DIContainer<{}>` plus `constructor` with no
// hand-kept list.
//
// `DIContainer.prototype` explicitly, not `Object.getPrototypeOf(this)` — a subclass's own members
// must not change which names are reserved, since the types describe `DIContainer` only. The chain
// is not walked either: inherited `Object.prototype` names need no reserving now that both maps
// are null-prototype.
//
// Statics (`compose`, and the private helpers) live on the constructor, never the instance, and
// are deliberately absent. `constructor` itself is present, since it is on every prototype, and
// stays reserved: `ReservedName` in types.ts lists it by hand because `keyof` never does.
const containerMembers = new Set(Object.getOwnPropertyNames(DIContainer.prototype));

class ClonedDiContainer<
  ContainerResolvers extends ResolvedDependencies = {},
> extends DIContainer<ContainerResolvers> {
  public constructor(
    resolvers: Resolvers<ContainerResolvers>,
    resolvedDependencies: ResolvedValues<ContainerResolvers>,
  ) {
    super();
    DIContainer.seedResolvers(this, resolvers, resolvedDependencies);
  }
}
