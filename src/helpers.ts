import { InvalidResolverError } from './errors.js';
import { INTERNAL_STATE } from './internalState.js';
import { type Factory, type ResolvedDependencies } from './types.js';

// Runtime guards the container uses at registration and merge time. None of them touch the resolve
// path, so nothing here is performance-sensitive; all of them exist for JavaScript consumers and
// `any` casts, since the types already refuse what they refuse.

export const FOREIGN_OWN_PROPERTY =
  'the container already has an own property with this name that is not a dependency';

/**
 * A dependency is an own getter on the container, so a container that has been frozen, sealed or
 * passed to `Object.preventExtensions` can take no new names. V8 says `Cannot define property x,
 * object is not extensible`, which names neither the container nor the cause; this does. `merge`
 * runs it in its validation pass for every incoming name that would need a new getter, so a
 * non-extensible receiver is refused before any existing name is replaced — otherwise the write
 * pass installed the replacements and then died on the first new getter.
 */
export function assertExtensible(container: object, name: string): void {
  if (!Object.isExtensible(container)) {
    throw new TypeError(
      `Cannot add dependency ${name}: the container is not extensible — was it frozen, sealed or passed to Object.preventExtensions?`,
    );
  }
}

/**
 * The platform meaning of `freeze` is that existing values cannot be written; for a container
 * that is a resolver being replaced. `seal` and `preventExtensions` only forbid new names, which
 * `assertExtensible` covers. Resolution is never refused: it writes into the cache inside the
 * state object, which no lock reaches.
 */
export function assertNotFrozen(container: object, name: string): void {
  if (isFrozenContainer(container)) {
    throw new TypeError(
      `Cannot replace dependency ${name}: the container is frozen — a frozen container resolves but takes no new or replaced dependencies`,
    );
  }
}

/**
 * The types already reject a non-function resolver; this is for JavaScript consumers and `any`
 * casts, who otherwise found out at first `get` — `TypeError: resolver is not a function`, far from
 * the registration and naming no dependency — or, for `null`, got a `DependencyIsMissingError` for
 * a name they had registered. Registration-time only, so the resolve path pays nothing. `merge`
 * runs it too, since a duck-typed input bypasses `add`.
 */
export function assertResolver(
  name: string,
  resolver: unknown,
): asserts resolver is Factory<ResolvedDependencies> {
  if (typeof resolver !== 'function') {
    throw new InvalidResolverError(name, resolver);
  }
}

/** What `merge` says it was handed when the argument is not a container. */
export function describeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
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

/**
 * Structural, not `instanceof`: a container from another copy of rsdi is still a container, and the
 * registry symbol is what makes that true. It asks for exactly the two maps `ForeignContainerState`
 * names, and must never ask for more — a container from another version may lack whatever this one
 * added later.
 *
 * `boolean`, not a `value is DIContainer<…>` type guard, on purpose. The guard read better, and
 * cost 2,097 type instantiations in every `bench-types` scenario — narrowing the argument makes the
 * compiler relate the whole class type inside `merge`, and on the smallest scenario that was 11% of
 * the budget. `merge` already casts, so the narrowing bought nothing.
 */
export function isContainer(value: unknown): boolean {
  if (!isObjectLike(value)) {
    return false;
  }

  // The state and both maps, not just the symbol: `typeof null` is `'object'`, and a state
  // missing `resolvedDependencies` was only touched in `merge`'s write pass — after earlier
  // containers had already been merged, which broke the all-or-nothing guarantee.
  const state = (value as Record<symbol, unknown>)[INTERNAL_STATE];

  return (
    isObjectLike(state) &&
    isObjectLike((state as Record<string, unknown>).resolvers) &&
    isObjectLike((state as Record<string, unknown>).resolvedDependencies)
  );
}

/**
 * Whether a consumer has frozen the container itself. Freezing is shallow: it makes the state
 * symbol's property non-writable and non-configurable but leaves the state object behind it
 * mutable, which is why resolution keeps working on a frozen container and why `update` used to.
 * `Object.freeze` is the only one of the three locks that turns `writable` off — `seal` and
 * `preventExtensions` leave it on — so one descriptor read on that single key tells them apart.
 * Not `Object.isFrozen`, which walks every own property and would make each `update` linear in
 * the number of dependencies.
 */
export function isFrozenContainer(container: object): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(container, INTERNAL_STATE);

  return descriptor !== undefined && descriptor.writable === false;
}

/** A non-null object — `typeof null` is `'object'`, which is the whole reason this exists. */
export function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

/** A property key as it should read in a message: symbols by their description. */
export function keyName(property: string | symbol): string {
  return typeof property === 'symbol' ? property.toString() : property;
}

/**
 * A built-in `TypeError` rather than an exported class, as for writing to a frozen object: this is
 * a bug in a factory, not a runtime condition a consumer catches. The types do not say `Readonly`;
 * `Factory` in types.ts explains what that measured.
 * @param action what was attempted, in the imperative — `write scratch`, `change its prototype`
 * @param resolving the factories in flight, so the message names the one that did it
 */
export function readOnlyContext(action: string, resolving: ReadonlySet<string>): TypeError {
  const where = resolving.size === 0 ? '' : ` while resolving ${[...resolving].join(' -> ')}`;

  return new TypeError(
    `The dependencies object passed to a factory is read-only; cannot ${action}${where}`,
  );
}
