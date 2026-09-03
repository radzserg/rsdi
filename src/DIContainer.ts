import {
  CircularDependencyError,
  DenyOverrideDependencyError,
  DependencyIsMissingError,
  ForbiddenNameError,
  InvalidContainerError,
} from './errors.js';
import {
  assertExtensible,
  assertResolver,
  describeValue,
  FOREIGN_OWN_PROPERTY,
  isContainer,
  keyName,
  readOnlyContext,
} from './helpers.js';
import { INTERNAL_STATE, type InternalState } from './internalState.js';
import {
  type ContainerLike,
  type ContainerSnapshot,
  type DenyInputKeys,
  type Factory,
  type IDIContainer,
  type MergedResolvers,
  type ReservedName,
  type ResolvedDependencies,
  type ResolvedDependencyValue,
  type ResolvedValues,
  type Resolvers,
  type StringLiteral,
  type UpdatedResolvers,
} from './types.js';

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
   * Seeds a fresh container with copies of another's maps — what `clone()` does. `protected` so a
   * consumer's subclass constructor can call it too.
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

    state.registrations++;

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

    try {
      Object.defineProperty(container, name, {
        get() {
          return this.get(name);
        },
      });
    } catch (error) {
      // A frozen, sealed or non-extensible container is the one way this fails; say so in the words
      // `merge` uses in its validation pass, rather than V8's `object is not extensible`. In the
      // `catch` and not before: an `isExtensible` call per registration measured on the add chain.
      assertExtensible(container, name);
      throw error;
    }
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
    extensible: boolean,
  ): void {
    if (containerMembers.has(name)) {
      throw new ForbiddenNameError(name);
    }

    if (Object.hasOwn(container, name)) {
      if (!container.has(name)) {
        throw new ForbiddenNameError(name, FOREIGN_OWN_PROPERTY);
      }

      return;
    }

    // A new name needs a new getter, which a non-extensible container cannot take. Checked here,
    // in the validation pass, so a merge that replaces an existing name and then introduces a new
    // one on a sealed receiver is refused before the replacement is written. The caller asks
    // `Object.isExtensible` once per merge; asking per name cost the compose rows a fifth.
    if (!extensible) {
      assertExtensible(container, name);
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
   * object, naming the key and the factory that was running. `preventExtensions` and
   * `setPrototypeOf` are refused too, or `Object.freeze(deps)` would freeze the container itself.
   * Only a write pays for the traps.
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
        throw readOnlyContext(`define ${keyName(property)}`, target[INTERNAL_STATE].resolving);
      },
      deleteProperty(target, property) {
        throw readOnlyContext(`delete ${keyName(property)}`, target[INTERNAL_STATE].resolving);
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
      // The structural mutations have no property to name. Without these two traps they fell
      // straight through to the container: `Object.freeze(deps)` made it non-extensible before
      // `defineProperty` could refuse anything — then tripped the `ownKeys` invariant, and every
      // later `add()` died with `object is not extensible` — and `Object.setPrototypeOf(deps, null)`
      // removed its methods.
      preventExtensions(target) {
        throw readOnlyContext(
          'freeze, seal or prevent extensions on it',
          target[INTERNAL_STATE].resolving,
        );
      },
      set(target, property) {
        throw readOnlyContext(`write ${keyName(property)}`, target[INTERNAL_STATE].resolving);
      },
      setPrototypeOf(target) {
        throw readOnlyContext('change its prototype', target[INTERNAL_STATE].resolving);
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
      registrations: 0,
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
    const state = container[INTERNAL_STATE];
    (state.resolvers as Record<string, Factory<CR>>)[name] = resolver;
    state.registrations++;
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
    // through `export()` would only allocate a second copy to throw away. A plain `DIContainer`,
    // not a subclass of this instance's class: a subclass constructor may take arguments this
    // method cannot know, so the clone carries the resolvers and nothing else.
    const { resolvedDependencies, resolvers } = this[INTERNAL_STATE];
    const newContainer = new DIContainer<ContainerResolvers>();
    DIContainer.seedResolvers(newContainer, resolvers, resolvedDependencies);

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

    const { registrations } = state;
    state.resolving.add(name);
    let value: ResolvedDependencyValue;
    try {
      value = resolver(state.context);
    } finally {
      // Released on a throw as well, or a factory that failed once would report a cycle forever.
      state.resolving.delete(name);
    }

    // Cache only if nothing was registered while the factory ran. An `update` or `merge` that
    // replaced this name mid-flight has already evicted the cache — or copied in the merged
    // container's own resolved value — and installed the new resolver; caching this result would
    // silently undo that, and every later request would serve the old factory's value. Comparing the
    // resolver's identity was not enough: `update(name, sameFactory)` asks for a fresh instance from
    // the same function, and a merge can carry the same function object with a value already
    // resolved. The value is still returned to the caller that asked for it, since that is what
    // actually ran; the next request runs whatever is registered then. One integer comparison, on
    // the miss path only; a registration of some unrelated name mid-flight costs one re-run.
    if (state.registrations === registrations) {
      state.resolvedDependencies[dependencyName] = value;
    }

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
    const extensible = Object.isExtensible(this);
    const incoming = containers.map((otherContainer, index) => {
      // The types only admit containers; this is for JavaScript consumers and `any` casts, who
      // otherwise got `Cannot convert undefined or null to object` from deep inside the loop — for
      // an `undefined` from a mistyped import, or a plain object that used to pass as a container
      // when the fields were string-keyed.
      if (!isContainer(otherContainer)) {
        throw new InvalidContainerError(index + 1, describeValue(otherContainer));
      }

      // The state directly, not `export()`: that copies now, and every name is copied again into
      // our own maps below — one throwaway map per merged container, for nothing.
      const { resolvedDependencies: newResolvedDependencies, resolvers: newResolvers } = (
        otherContainer as DIContainer<ResolvedDependencies>
      )[INTERNAL_STATE];
      const names = Object.keys(newResolvers);

      for (const name of names) {
        DIContainer.assertNameAvailable(this, name, extensible);
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

      own.registrations++;

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
   * Safe to call while the name's own factory is running: the value that factory produces is
   * handed to whoever asked for it but not cached, so the next request runs the replacement.
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
// `DIContainer.prototype` explicitly, not `Object.getPrototypeOf(this)` — a consumer subclass's own
// members must not change which names are reserved, since the types describe `DIContainer` only. The chain
// is not walked either: inherited `Object.prototype` names need no reserving now that both maps
// are null-prototype.
//
// Statics (`compose`, and the private helpers) live on the constructor, never the instance, and
// are deliberately absent. `constructor` itself is present, since it is on every prototype, and
// stays reserved: `ReservedName` in types.ts lists it by hand because `keyof` never does.
const containerMembers = new Set(Object.getOwnPropertyNames(DIContainer.prototype));
