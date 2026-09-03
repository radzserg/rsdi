import { type ResolvedDependencies, type ResolvedValues, type Resolvers } from './types.js';

// All of the container's state lives behind this one symbol, in a plain object; the helpers that
// work on it are `static` methods of the class. Two things follow, and both are the point. A
// dependency can never collide with an internal — `resolvers` and `setResolver` are ordinary
// dependency names — so nothing non-public has to be reserved, and `ReservedName` in types.ts is
// simply `keyof DIContainer<{}>` with no hand-kept list to drift. And a factory cannot reach the
// state by accident through the deps object: `deps.resolvers` used to hand back the live map, a
// back door under every check `add` performs — a resolver injected there had no name check, no
// function check and no getter — and the proxy's `ownKeys` trap hides the symbol, so it is not
// enumerable either.
//
// `Symbol.for`, not `Symbol()`: `merge` and `compose` read another container's state by this key,
// and two copies of rsdi in one dependency tree must still be able to compose each other's
// containers, as they could when the fields were string-keyed. A registry symbol is the same
// symbol in every copy. The price is that `Symbol.for('rsdi.internalState')` is a known key — so
// this is not a security boundary, and was never meant as one; TypeScript's `protected` says who
// may use it, and nothing in JavaScript short of `#private` fields, which break `this` through the
// proxy, hides state from a caller who is determined to reach it.
//
// Its own module so that `helpers.ts` and `DIContainer.ts` can both import it without a cycle.
// Exported for the tests, which need the maps to assert identity across writes. It is not
// re-exported from index.ts, and the `exports` map blocks the deep import.
export const INTERNAL_STATE: unique symbol = Symbol.for('rsdi.internalState');

/**
 * Everything a container owns, kept in one object behind `INTERNAL_STATE` on the class.
 * `context` is the proxy factories receive; the two maps are null-prototype; `resolving` is the
 * set of names whose factory is running. Exported because a `protected` member's type has to be
 * nameable for declaration emit, not because consumers should use it.
 */
export type InternalState<ContainerResolvers extends ResolvedDependencies> = {
  readonly context: ContainerResolvers;
  /**
   * Bumped on every resolver write — `add`, `update`, `merge`, seeding a clone. `get` reads it
   * before running a factory and caches the result only if it is unchanged after, so a resolver
   * replaced mid-flight never has the old factory's value cached under it. A counter rather than
   * comparing function identity: `update(name, sameFactory)` and a `merge` carrying the same
   * function object are replacements too, and identity cannot see them.
   */
  registrations: number;
  readonly resolvedDependencies: ResolvedValues<ContainerResolvers>;
  readonly resolvers: Resolvers<ContainerResolvers>;
  readonly resolving: Set<string>;
};
