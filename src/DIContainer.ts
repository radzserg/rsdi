import {
  CircularDependencyError,
  DenyOverrideDependencyError,
  DependencyIsMissingError,
  ForbiddenNameError,
} from './errors.js';
import {
  type ContainerLike,
  type ContainerSnapshot,
  type DenyInputKeys,
  type Factory,
  type IDIContainer,
  type MergedResolvers,
  type ResolvedDependencies,
  type ResolvedDependencyValue,
  type Resolvers,
  type StringLiteral,
  type UpdatedResolvers,
} from './types.js';

/**
 * Dependency injection container
 */
export class DIContainer<ContainerResolvers extends ResolvedDependencies = {}> {
  // Both maps are null-prototype. `get()` reads them with plain property lookups — the cheapest
  // thing on the hot path — so with an ordinary `{}` a dependency named after an `Object.prototype`
  // member resolved to the inherited function: `add('toString', () => 'a value')` registered fine
  // and then handed back `[Function: toString]`, because `'toString' in this.resolvedDependencies`
  // was true. Guarding each lookup with `Object.hasOwn` would fix it and tax every cache hit;
  // removing the prototype fixes it and taxes nothing. These maps are built a key at a time and so
  // live in V8's dictionary mode either way, which is why the change is free.
  //
  // `export()` still hands out ordinary objects — its copies are for consumers, not for lookup.
  protected resolvedDependencies: {
    [name in keyof ContainerResolvers]?: ResolvedDependencyValue;
  } = Object.create(null) as { [name in keyof ContainerResolvers]?: ResolvedDependencyValue };

  protected resolvers: Resolvers<ContainerResolvers> = Object.create(
    null,
  ) as Resolvers<ContainerResolvers>;

  private readonly context: ContainerResolvers = {} as ContainerResolvers;

  // Names whose factory is running right now, in call order, so a factory that reaches back to a
  // name above it in the chain is reported as `a -> b -> a` instead of dying in
  // `RangeError: Maximum call stack size exceeded` with nothing named. Only a cache miss touches
  // this — a hit returns before it is consulted — so cached resolution costs what it did.
  //
  // An ordinary field rather than a `#private` one on purpose. The name is reserved automatically
  // by `containerMembers`, and a factory that receives the context proxy and calls `get` on it
  // still works: `proxy.resolving` forwards to the target, where `proxy.#resolving` would throw.
  private readonly resolving = new Set<string>();

  public constructor() {
    // What factories receive. Reads forward to the container, whose dependency getters do the
    // resolving — and a read of a name the container does not have throws instead of yielding
    // `undefined`. That is the whole reason the proxy exists: forwarding alone is what `this`
    // already does, and measured the same. The case it guards is the one the types cannot see —
    // a module's factory destructuring a name another module provides, composed without that
    // module. Without the trap that factory silently built its service around `undefined`.
    //
    // The `in` test walks the prototype chain on purpose: `toString`, `constructor`, and the
    // container's own methods are all reachable through the context, as they are on the container.
    // Anything that probes a protocol key the container lacks — `then` from `await deps`,
    // `toJSON` from `JSON.stringify(deps)` — throws; neither is a supported use of the context.
    this.context = new Proxy(this, {
      get(target, property) {
        // Indexing with the key as given: `toString()` here cost a call on every dependency a
        // factory destructures, and turned a symbol lookup into a miss under its description.
        const value = target[property as keyof DIContainer<ContainerResolvers>];
        if (value === undefined && typeof property === 'string' && !(property in target)) {
          throw new DependencyIsMissingError(property, [...target.resolving]);
        }

        return value;
      },
    }) as unknown as ContainerResolvers;
  }

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
   * Adds new dependency resolver to the container. If dependency with given name already exists it will throw an error.
   * Use update method instead. It will override existing dependency.
   * @param name
   * @param resolver
   */
  public add<N extends string, V>(
    name: StringLiteral<DenyInputKeys<N, keyof ContainerResolvers>>,
    resolver: Factory<ContainerResolvers, V>,
  ): IDIContainer<ContainerResolvers & { [n in N]: V }> {
    if (containerMembers.has(name)) {
      throw new ForbiddenNameError(name);
    }

    if (this.has(name)) {
      throw new DenyOverrideDependencyError(name);
    }

    this.setValue(name, resolver);

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
    // Handed the live maps on purpose — `setResolvers` is what copies them, and routing this
    // through `export()` would only allocate a second copy to throw away.
    const newContainer = new ClonedDiContainer(
      this.resolvers,
      this.resolvedDependencies as { [name in keyof ContainerResolvers]: ResolvedDependencyValue },
    );

    return newContainer as unknown as IDIContainer<ContainerResolvers>;
  }

  /**
   * Returns the container's resolvers and its already-resolved values.
   *
   * Both maps are copies. `add`, `update` and `merge` write into the internal maps in place, so
   * handing out the live objects would let a caller both observe registrations made after the
   * call and mutate the container by writing into what they were given. Nothing inside the class
   * goes through here — `clone` and `merge` read the protected maps directly — so the copy is
   * paid only by a consumer that asks for it.
   *
   * Declared on `IDIContainer` as well, so it stays reachable after `add` has widened the type.
   */
  public export(): ContainerSnapshot<ContainerResolvers> {
    return {
      resolvedDependencies: { ...this.resolvedDependencies },
      resolvers: { ...this.resolvers },
    };
  }

  /**
   * Extends container with given function. It will pass container as an argument to the function.
   * Function should return new container with extended resolvers.
   * It is useful when you want to split your container into multiple files.
   * You can create a file with resolvers and extend container with it.
   * You can also use it to create multiple containers with different resolvers.
   *
   * For example:
   *
   * const container = new DIContainer()
   * .extend(addValidators)
   *
   * export type DIWithValidators = ReturnType<typeof addValidators>;
   * export const addValidators = (container: DIWithDataAccessors) => {
   * return container
   * .add('myValidatorA', ({ a, b, c }) => new MyValidatorA(a, b, c))
   * .add('myValidatorB', ({ a, b, c }) => new MyValidatorB(a, b, c));
   * };
   * @param diConfigurationFactory
   */
  public extend<E extends (container: IDIContainer<ContainerResolvers>) => IDIContainer>(
    diConfigurationFactory: E,
  ): ReturnType<E> {
    return diConfigurationFactory(
      this as unknown as IDIContainer<ContainerResolvers>,
    ) as ReturnType<E>;
  }

  /**
   * Resolve dependency by name. Alternatively you can use property access to resolve dependency.
   * For example: const { a, b } = container;
   * @param dependencyName
   */
  public get<Name extends keyof ContainerResolvers>(
    dependencyName: Name,
  ): ContainerResolvers[Name] {
    // A factory is allowed to produce `undefined`, and that value has to be cached like any other,
    // or the factory re-runs on every access while `hasResolvedDependency` reports it resolved. The
    // `in` test is what makes that case a hit — on a null-prototype map it is an own-key check with
    // nothing to walk — but it is reached only when the read came back `undefined`. Testing `in`
    // first, for every call, made a cache hit two dictionary lookups instead of one and cost the
    // `resolve.bench.ts` cached rows a third of their throughput. A miss pays the extra test once,
    // against the factory it is about to run.
    const resolved = this.resolvedDependencies[dependencyName];
    if (resolved !== undefined || dependencyName in this.resolvedDependencies) {
      return resolved;
    }

    const resolver = this.resolvers[dependencyName];
    if (!resolver) {
      throw new DependencyIsMissingError(dependencyName as string, [...this.resolving]);
    }

    const name = dependencyName as string;
    if (this.resolving.has(name)) {
      throw new CircularDependencyError([...this.resolving, name]);
    }

    this.resolving.add(name);
    let value: ResolvedDependencyValue;
    try {
      value = resolver(this.context);
    } finally {
      // Released on a throw as well, or a factory that failed once would report a cycle forever.
      this.resolving.delete(name);
    }

    this.resolvedDependencies[dependencyName] = value;

    return value;
  }

  /**
   * Checks if dependency with given name exists
   * @param name
   */
  public has(name: string): boolean {
    return Object.hasOwn(this.resolvers, name);
  }

  public hasResolvedDependency(name: string): boolean {
    return Object.hasOwn(this.resolvedDependencies, name);
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
   * when a separate instance is required.
   * @param containers
   */
  public merge<T extends readonly ContainerLike[]>(
    ...containers: T
  ): IDIContainer<ContainerResolvers & MergedResolvers<T>> {
    const ownResolvers = this.resolvers as Record<string, Factory<ContainerResolvers>>;
    const ownResolvedDependencies = this.resolvedDependencies as Record<
      string,
      ResolvedDependencyValue
    >;

    for (const otherContainer of containers) {
      // The protected maps directly, not `export()`: that copies now, and every name is copied
      // again into our own maps below — one throwaway map per merged container, for nothing.
      const { resolvedDependencies: newResolvedDependencies, resolvers: newResolvers } =
        otherContainer as DIContainer<ResolvedDependencies>;

      for (const name of Object.keys(newResolvers)) {
        // `add` and `update` refuse these names, so a real container never carries one — but
        // `merge` accepts anything shaped like a container at runtime, and an own property named
        // `get` would shadow the method: `container.get` becomes a getter that calls `this.get`,
        // and the first resolution dies in a stack overflow. One Set lookup per incoming name
        // keeps the failure a `ForbiddenNameError`, and keeps merge linear.
        if (containerMembers.has(name)) {
          throw new ForbiddenNameError(name);
        }

        // A replaced resolver must not keep the value the previous one produced — the same
        // eviction `update()` performs. Only the overriding container's own cache may survive,
        // so a name it re-registers without having resolved yet has to lose the old value;
        // otherwise `merge`/`compose` return the earlier container's instance from a resolver
        // that no longer exists, silently contradicting last-writer-wins.
        //
        // Our own cache is tested first so that merging into a container that has resolved
        // nothing — the `compose` case — issues no deletes at all.
        if (
          Object.hasOwn(this.resolvedDependencies, name) &&
          !Object.hasOwn(newResolvedDependencies, name)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.resolvedDependencies[name as keyof ContainerResolvers];
        }

        // Only the incoming names can be new, so this replaces a rescan of the whole merged map.
        this.addContainerProperty(name);

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
   * Updates existing dependency resolver. If dependency with given name does not exist it will throw an error.
   * In most cases you don't need to override dependencies and should use add method instead. This approach will
   * help you to avoid overriding dependencies by mistake.
   *
   * You may want to override dependency if you want to mock it in tests.
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

    this.setValue(name, resolver);
    if (Object.hasOwn(this.resolvedDependencies, name)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.resolvedDependencies[name];
    }

    return this as unknown as IDIContainer<UpdatedResolvers<ContainerResolvers, N, V>>;
  }

  protected setResolvers<CR extends ResolvedDependencies>(
    resolvers: Resolvers<CR>,
    resolvedDependencies: {
      [name in keyof CR]: ResolvedDependencyValue;
    },
  ) {
    // A plain `Error` on purpose, where every other throw in this file is a typed class. Those are
    // conditions a consumer can reach through the public API and may want to catch; this one is
    // reachable only from a subclass constructor and is a programming error at wiring time, not a
    // runtime state. Exporting a class for it would widen the public surface for nothing.
    if (Object.keys(this.resolvers).length !== 0) {
      throw new Error('Cannot set resolvers on a container that already has resolvers');
    }

    // Both maps are copied, not adopted. `add` and `merge` write into them in place, so a clone
    // that kept its source's map would leak every later registration back into it.
    //
    // Entry by entry rather than by spread: these maps are built a key at a time, which leaves
    // them in V8's dictionary mode, and spreading one of those costs over twice what the loop does.
    const ownResolvers = this.resolvers as Record<string, Factory<ContainerResolvers>>;
    const source = resolvers as unknown as Record<string, Factory<ContainerResolvers>>;
    for (const name of Object.keys(source)) {
      ownResolvers[name] = source[name];
      this.addContainerProperty(name);
    }

    const ownResolvedDependencies = this.resolvedDependencies as Record<
      string,
      ResolvedDependencyValue
    >;
    for (const name of Object.keys(resolvedDependencies)) {
      ownResolvedDependencies[name] = resolvedDependencies[name];
    }
  }

  private addContainerProperty(name: string): void {
    if (Object.hasOwn(this, name)) {
      return;
    }

    Object.defineProperty(this, name, {
      get() {
        return this.get(name);
      },
    });
  }

  /**
   * Sets value to the container
   */
  private setValue(name: string, resolver: Factory<ContainerResolvers>): void {
    // Writing into the map rather than rebuilding it is what makes a chain of `add` calls linear
    // instead of quadratic. It is safe only because no two containers ever share a resolver map —
    // `setResolvers` copies what `clone()` hands it, which `clone.test.ts` pins.
    (this.resolvers as Record<string, Factory<ContainerResolvers>>)[name] = resolver;

    this.addContainerProperty(name);
  }
}

// Derived from the class rather than hand-listed: the list is only correct if it is exactly the
// class's own members, and a missing entry is not a compile error anywhere — `export` was absent
// until a dependency of that name was found to break every `merge`.
//
// Prototype members and instance fields both matter, for different reasons:
//
//   - Prototype — `addContainerProperty` defines dependencies as *own* properties, which shadow
//     the methods the class calls through `this`. Non-public members are at stake too: a
//     dependency named `setValue` registers fine and makes the *next* `add` throw
//     `TypeError: this.setValue is not a function`.
//   - Fields (`resolvers`, `resolvedDependencies`, `context`, `resolving`) — already own
//     properties when the constructor returns, so `addContainerProperty`'s `Object.hasOwn`
//     early-return skipped wiring the getter. `add('resolvers', …)` half-worked: `get('resolvers')`
//     resolved, while `container.resolvers` handed back the container's own internal map. A
//     throwaway instance is the only way to read them, since fields exist nowhere until one is
//     constructed.
//
// `DIContainer.prototype` explicitly, not `Object.getPrototypeOf(this)` — a subclass's own members
// must not change which names are reserved, since the types describe `DIContainer` only. The chain
// is not walked either: inherited `Object.prototype` names need no reserving now that both maps
// are null-prototype.
//
// Statics (`compose`) live on the constructor, never the instance, and are deliberately absent.
const containerMembers = new Set([
  ...Object.getOwnPropertyNames(DIContainer.prototype),
  ...Object.getOwnPropertyNames(new DIContainer()),
]);

class ClonedDiContainer<
  ContainerResolvers extends ResolvedDependencies = {},
> extends DIContainer<ContainerResolvers> {
  public constructor(
    resolvers: Resolvers<ContainerResolvers>,
    resolvedDependencies: {
      [name in keyof ContainerResolvers]: ResolvedDependencyValue;
    },
  ) {
    super();
    this.setResolvers(resolvers, resolvedDependencies);
  }
}
