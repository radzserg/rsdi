import { InvalidResolverError } from './errors.js';
import { INTERNAL_STATE } from './internalState.js';
import { type Factory, type ResolvedDependencies } from './types.js';

// Runtime guards the container uses at registration and merge time. None of them touch the resolve
// path, so nothing here is performance-sensitive; all of them exist for JavaScript consumers and
// `any` casts, since the types already refuse what they refuse.

export const FOREIGN_OWN_PROPERTY =
  'the container already has an own property with this name that is not a dependency';

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
 * registry symbol is what makes that true.
 *
 * `boolean`, not a `value is DIContainer<…>` type guard, on purpose. The guard read better, and
 * cost 2,097 type instantiations in every `bench-types` scenario — narrowing the argument makes the
 * compiler relate the whole class type inside `merge`, and on the smallest scenario that was 11% of
 * the budget. `merge` already casts, so the narrowing bought nothing.
 */
export function isContainer(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<symbol, unknown>)[INTERNAL_STATE] === 'object'
  );
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
