import { type DIContainer } from './DIContainer.js';

/**
 * Anything that can be composed/merged: a raw container instance or one that has
 * already been widened by `add` (which returns `IDIContainer`).
 */
export type ContainerLike<R extends ResolvedDependencies = ResolvedDependencies> =
  | DIContainer<R>
  | IDIContainer<R>;

/**
 * What `export()` returns: copies of the container's resolver map and of the values it has
 * resolved so far. `resolvedDependencies` is partial because resolution is lazy — a name is
 * present only once something has asked for it.
 *
 * The factories are typed through `SnapshotFactory`, not `Factory`, and the difference is
 * load-bearing. This type sits in a *return* position on `IDIContainer`, so a plain
 * `(resolvers: CR) => V` there puts the resolver map in a contravariant slot. Assigning
 * `IDIContainer<{ b: Date }>` to `ContainerLike` — which every `merge` and `compose` argument
 * does — then needs `Record<string, any>` assignable to `{ b: Date }`, and it is not: with `Factory`
 * here, every widened container stopped being a `ContainerLike` and every `merge`/`compose` call
 * site broke. The method-shorthand indirection makes the parameter bivariant, as method parameters
 * always are, so the check passes in both directions and the hover still shows the real parameter
 * type. The type tests pin both the shape and the assignability.
 */
export type ContainerSnapshot<ContainerResolvers extends ResolvedDependencies> = {
  resolvedDependencies: Partial<ContainerResolvers>;
  resolvers: {
    [K in keyof ContainerResolvers]?: SnapshotFactory<ContainerResolvers, ContainerResolvers[K]>;
  };
};

export type DenyInputKeys<T, Disallowed> = T & (T extends Disallowed ? never : T);

/**
 * A dependency's factory. It receives the container's dependencies — the container itself behind a
 * proxy whose `set`, `deleteProperty` and `defineProperty` traps throw, so the object is read-only
 * at runtime.
 *
 * Not `Readonly<ContainerResolvers>` here, although that is the honest type. Measured with
 * `bench-types`, the mapped type costs a fresh instantiation over the whole resolver map at every
 * `add` link: the flat 200-chain scenario went from 81% to 94% of its budget and the module-seeded
 * one from 77% to 90%, for a compile error on a write the runtime already refuses with a clear
 * message. Type-check cost is what this library sells, so the runtime check stands alone.
 */
export type Factory<
  ContainerResolvers extends ResolvedDependencies,
  Value = ResolvedDependencyValue,
> = (resolvers: ContainerResolvers) => Value;

export type IDIContainer<ContainerResolvers extends ResolvedDependencies = {}> =
  ContainerResolvers & {
    add: <N extends string, V>(
      name: StringLiteral<DenyInputKeys<N, keyof ContainerResolvers | ReservedName>>,
      resolver: Factory<ContainerResolvers, V>,
    ) => IDIContainer<ContainerResolvers & { [n in N]: V }>;
    clone: () => IDIContainer<ContainerResolvers>;
    export: () => ContainerSnapshot<ContainerResolvers>;
    extend: <E extends (container: IDIContainer<ContainerResolvers>) => IDIContainer>(
      f: E,
    ) => ReturnType<E>;
    get: <Name extends keyof ContainerResolvers>(dependencyName: Name) => ContainerResolvers[Name];
    has: (name: string) => boolean;
    hasResolvedDependency: (name: string) => boolean;
    merge: <T extends readonly ContainerLike[]>(
      ...containers: T
    ) => IDIContainer<ContainerResolvers & MergedResolvers<T>>;
    update: <N extends keyof ContainerResolvers, V>(
      name: StringLiteral<N>,
      resolver: Factory<ContainerResolvers, V>,
    ) => IDIContainer<UpdatedResolvers<ContainerResolvers, N, V>>;
  };

/**
 * Collapses the resolver maps of a tuple of containers into a single map.
 *
 * Uses a union-to-intersection fold rather than a recursive tuple walk: a
 * recursive fold trips TypeScript's instantiation depth limiter (TS2589) once a
 * few dozen containers are combined, which silently degrades inference.
 */
export type MergedResolvers<T extends readonly unknown[]> =
  UnionToIntersection<ResolversOf<T[number]>> extends infer Merged
    ? Merged extends ResolvedDependencies
      ? Merged
      : {}
    : {};

/**
 * Every name a dependency cannot take, so that `add` rejects it at compile time and not only at
 * runtime. The runtime Set is derived from `DIContainer.prototype` (`containerMembers` in
 * `DIContainer.ts`); this is its type-level twin, and it is derived too: `keyof DIContainer<{}>`
 * is exactly the public methods. The non-public members are symbol-keyed, so a string can never
 * collide with them and they need no reserving on either side.
 *
 * `constructor` is on every prototype, so the runtime Set always holds it, but `keyof` of an
 * instance type never lists it. Reserved on purpose: an own `constructor` getter would shadow the
 * inherited one, and anything reading `instance.constructor` for a class name would resolve a
 * dependency as a side effect. `reservedNames.test.ts` asserts the two sides are equal.
 */
export type ReservedName = 'constructor' | keyof DIContainer<{}>;

export type ResolvedDependencies = {
  [k: string]: ResolvedDependencyValue;
};

export type ResolvedDependencyValue = any;

/**
 * The container's cache of resolved values, keyed like the resolver map. Optional throughout:
 * resolution is lazy, so a name is present only once something has asked for it.
 */
export type ResolvedValues<ContainerResolvers extends ResolvedDependencies> = {
  [name in keyof ContainerResolvers]?: ResolvedDependencyValue;
};

export type Resolvers<CR extends ResolvedDependencies> = {
  [k in keyof CR]?: Factory<CR>;
};

/**
 * Extracts the resolver map from a container type. The class branch has to come
 * first: a `DIContainer` instance also structurally matches `IDIContainer`.
 */
export type ResolversOf<C> =
  C extends DIContainer<infer R> ? R : C extends IDIContainer<infer R> ? R : never;

/**
 * The resolver map with `N` rewritten to `V`, for when `update` genuinely changes a
 * dependency's type.
 *
 * The rewrite is homomorphic (`K in keyof CR`) rather than keyed on
 * `Exclude<keyof CR, N>`. Excluding a key destroys homomorphism, which forces
 * TypeScript to enumerate every remaining key eagerly on each link of a chain; the
 * homomorphic form stays deferred over a generic map. Measured on a 300-key container,
 * a chain of 40 type-changing updates costs ~54k instantiations this way against
 * ~131k with the `Exclude` form.
 */
export type RewrittenResolvers<CR extends ResolvedDependencies, N extends keyof CR, V> = {
  [K in keyof CR]: K extends N ? V : CR[K];
};

/**
 * Gives a built container a name that survives into hovers and error messages.
 *
 * `typeof container` and `ReturnType<typeof configureDI>` both resolve to a type
 * that already carries its own name, so TypeScript prints the whole resolver
 * intersection instead of the alias — unreadable once a container has more than a
 * handful of dependencies. Wrapping the container in this helper produces a fresh
 * alias, so diagnostics print `AppContainer` rather than
 * `IDIContainer<{ a: … } & { b: … } & …>`.
 *
 * export type AppContainer = SealedContainer<typeof container>;
 *
 * This is an ergonomic wrapper, not a performance one: resolving a container type
 * in a consuming file is already cheap, and naming it costs marginally more.
 * The dependency types themselves are unchanged.
 */
export type SealedContainer<C> = IDIContainer<ResolversOf<C>>;

export type SnapshotFactory<ContainerResolvers extends ResolvedDependencies, Value> = {
  bivarianceHack(resolvers: ContainerResolvers): Value;
}['bivarianceHack'];

export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * The resolver map after `update` replaces `N` with `V`.
 *
 * Replacing a key cannot be expressed as an intersection the way `add` expresses a new
 * one — `{ a: A } & { a: B }` is `A & B`, not `B` — so the map has to be rewritten, and
 * a rewrite per link makes a chain of updates O(depth × container-size). A field report
 * from a ~340-dependency application hit TS2589 on a chain of `update` calls; reproduced
 * here on a 300-key container, the previous `Exclude`-keyed rewrite starts erroring at
 * **50** chained calls. That is a shape real test harnesses reach, since overriding one
 * service per test naturally accumulates into a long chain off the built container.
 *
 * The common case is the one that got cheap. A test double stands in for the real
 * service *at the same type*, so the resolver map is unchanged and the container type is
 * passed straight through — no rewrite, nothing to accumulate. A chain of same-type
 * overrides is then flat in both cost and depth: 60 links cost what 20 do (~45k
 * instantiations, no diagnostics), against ~225k plus 11 `TS2589` errors before.
 *
 * The passthrough tests *mutual* assignability, not one-way. One-way would also catch
 * replacing a dependency with a subtype — but that case is supposed to narrow the
 * container type (`Animal` updated to a `Dog` factory makes the container's `pet` a
 * `Dog`), and a one-way check would silently widen it back. Every inference the
 * `Exclude` form produced is preserved; `__typetests__` pins the cases.
 */
export type UpdatedResolvers<CR extends ResolvedDependencies, N extends keyof CR, V> = [V] extends [
  CR[N],
]
  ? [CR[N]] extends [V]
    ? CR
    : RewrittenResolvers<CR, N, V>
  : RewrittenResolvers<CR, N, V>;
