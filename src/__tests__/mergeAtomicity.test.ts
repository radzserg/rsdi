import { DIContainer } from '../DIContainer.js';
import {
  DependencyIsMissingError,
  ForbiddenNameError,
  InvalidContainerError,
  InvalidResolverError,
} from '../errors.js';
import { INTERNAL_STATE } from '../internalState.js';
import { describe, expect, test } from 'vitest';

// `merge` used to check and write one name at a time. When a later name was refused, the earlier
// containers — and the earlier names of the failing one — were already merged into `this`, and a
// cache eviction performed along the way could not be undone. `add` has always checked before
// writing; `merge` now does the same for every incoming name of every container.
describe('merge is all-or-nothing', () => {
  const duckTyped = (resolvers: Record<string, unknown>) =>
    ({ [INTERNAL_STATE]: { resolvedDependencies: {}, resolvers } }) as unknown as DIContainer;

  test('a non-function resolver in the last container leaves nothing from the earlier ones', () => {
    const base = new DIContainer().add('x', () => 'x');
    const good = new DIContainer().add('p', () => 'p').add('q', () => 'q');
    const bad = duckTyped({ r: () => 'r', s: 'not a function' });

    expect(() => base.merge(good, bad)).toThrow(InvalidResolverError);

    for (const name of ['p', 'q', 'r', 's']) {
      expect(base.has(name)).toBe(false);
      expect(Object.hasOwn(base, name)).toBe(false);
    }
    expect(base.x).toEqual('x');
  });

  test('a reserved name in the last container leaves nothing from the earlier ones', () => {
    const base = new DIContainer();
    const good = new DIContainer().add('p', () => 'p');
    const bad = duckTyped({ get: () => 'shadow' });

    expect(() => base.merge(good, bad)).toThrow(ForbiddenNameError);
    expect(base.has('p')).toBe(false);
    expect(typeof base.get).toBe('function');
  });

  test('a collision with a foreign own property leaves nothing from the earlier ones', () => {
    const base = new DIContainer() as DIContainer & { cache?: string };
    base.cache = 'stray value';
    const good = new DIContainer().add('p', () => 'p');
    const colliding = new DIContainer().add('cache', () => 'from factory');

    expect(() => base.merge(good, colliding)).toThrow(ForbiddenNameError);
    expect(base.has('p')).toBe(false);
    expect(base.cache).toEqual('stray value');
  });

  test('a failed merge does not evict a cached value an earlier container would have replaced', () => {
    const base = new DIContainer().add('x', () => ({ instance: 'original' }));
    const original = base.x;
    const replacesX = new DIContainer().add('x', () => ({ instance: 'replacement' }));
    const bad = duckTyped({ s: 42 });

    expect(() => base.merge(replacesX, bad)).toThrow(InvalidResolverError);

    expect(base.hasResolvedDependency('x')).toBe(true);
    expect(base.x).toBe(original);
  });

  test('a failed merge does not copy resolved values either', () => {
    const base = new DIContainer();
    const resolved = new DIContainer().add('p', () => 'p');
    expect(resolved.p).toEqual('p');
    const bad = duckTyped({ s: 42 });

    expect(() => base.merge(resolved, bad)).toThrow(InvalidResolverError);
    expect(base.hasResolvedDependency('p')).toBe(false);
  });

  test('a merge that passes validation still writes everything', () => {
    const base = new DIContainer().add('x', () => 'x');
    const a = new DIContainer().add('p', () => 'p');
    const b = new DIContainer().add('q', () => 'q');
    expect(b.q).toEqual('q');

    const merged = base.merge(a, b);

    expect(merged.p).toEqual('p');
    expect(merged.q).toEqual('q');
    expect(merged.hasResolvedDependency('q')).toBe(true);
  });
});

// The types admit only containers. A JavaScript consumer — or an `undefined` from a mistyped
// import — used to get `Cannot convert undefined or null to object` from deep inside the loop.
describe('merge and compose refuse a non-container argument', () => {
  const cases: Array<[string, unknown, string]> = [
    ['undefined', undefined, 'argument 1 is undefined'],
    ['null', null, 'argument 1 is null'],
    ['a plain object', { resolvers: {} }, 'argument 1 is a plain object'],
    ['a string', 'services', 'argument 1 is a string'],
    ['a function', () => 1, 'argument 1 is a function'],
    ['another class', new Date(), 'argument 1 is an instance of Date'],
  ];

  test.each(cases)('%s', (_, value, message) => {
    expect(() => DIContainer.compose(value as DIContainer)).toThrow(InvalidContainerError);
    expect(() => DIContainer.compose(value as DIContainer)).toThrow(
      `compose expects containers; ${message}`,
    );
    expect(() => new DIContainer().merge(value as DIContainer)).toThrow(
      `merge expects containers; ${message}`,
    );
  });

  // The symbol alone is not enough. `typeof null === 'object'` let a null state through, and a
  // state missing a map was only touched in the write pass — after earlier containers were merged.
  const malformed: Array<[string, unknown]> = [
    ['a null state', { [INTERNAL_STATE]: null }],
    ['an empty state', { [INTERNAL_STATE]: {} }],
    ['a state without resolvedDependencies', { [INTERNAL_STATE]: { resolvers: {} } }],
    ['a state without resolvers', { [INTERNAL_STATE]: { resolvedDependencies: {} } }],
    [
      'a state with a null map',
      { [INTERNAL_STATE]: { resolvedDependencies: null, resolvers: {} } },
    ],
  ];

  test.each(malformed)('%s is refused before anything is written', (_, value) => {
    const base = new DIContainer();
    const good = new DIContainer().add('p', () => 'p');

    expect(() => base.merge(good, value as DIContainer)).toThrow(InvalidContainerError);
    expect(() => base.merge(good, value as DIContainer)).toThrow('argument 2 is a plain object');
    expect(base.has('p')).toBe(false);
  });

  // Both maps present, but the cache holds a name the resolver map lacks. Copied unchecked, that
  // was a phantom dependency on the receiver: `has()` false, `hasResolvedDependency()` true and
  // `get()` returning the value. `seedResolvers` already refused it; `merge` now does too.
  test('a resolved value with no resolver is refused before anything is written', () => {
    const base = new DIContainer();
    const good = new DIContainer().add('p', () => 'p');
    const phantom = {
      [INTERNAL_STATE]: { resolvedDependencies: { ghost: 'value' }, resolvers: { a: () => 1 } },
    } as unknown as DIContainer;

    expect(() => base.merge(good, phantom)).toThrow(InvalidContainerError);
    expect(() => base.merge(good, phantom)).toThrow(
      'merge expects containers; argument 2 is a container whose resolved value ghost has no resolver',
    );
    expect(base.has('p')).toBe(false);
    expect(base.has('a')).toBe(false);
    expect(base.hasResolvedDependency('ghost')).toBe(false);
    expect(() => base.get('ghost' as never)).toThrow(DependencyIsMissingError);
  });

  // The registry symbol lets two installed copies of rsdi compose each other's containers, and
  // those copies may be different versions. Only the two maps are a contract: a foreign state may
  // carry fields this version has never seen and lack any it added after them.
  test('a state from another version of rsdi is accepted when it carries the two maps', () => {
    const fromAnotherVersion = {
      [INTERNAL_STATE]: {
        aFieldFromTheFuture: 42,
        resolvedDependencies: { b: 'resolved elsewhere' },
        resolvers: { a: () => 'a', b: () => 'never runs' },
        // no `registrations`, no `resolving`, no `context`
      },
    } as unknown as DIContainer;

    const composed = DIContainer.compose(fromAnotherVersion);

    expect(composed.get('a' as never)).toEqual('a');
    expect(composed.get('b' as never)).toEqual('resolved elsewhere');
    expect(
      new DIContainer()
        .add('c', () => 'c')
        .merge(fromAnotherVersion)
        .get('a' as never),
    ).toEqual('a');
  });

  test('names the position of the offending argument and writes nothing', () => {
    const base = new DIContainer();
    const good = new DIContainer().add('p', () => 'p');

    expect(() => base.merge(good, undefined as unknown as DIContainer)).toThrow(
      'merge expects containers; argument 2 is undefined',
    );
    expect(base.has('p')).toBe(false);
  });
});

// A dependency is an own getter, so a container that was frozen, sealed or passed to
// `Object.preventExtensions` can take no new names. The write pass used to find that out on the
// first new getter — after it had already replaced the existing names in the same merge.
describe('a non-extensible receiver', () => {
  const lockers: Array<[string, (container: object) => void]> = [
    ['Object.preventExtensions', (container) => void Object.preventExtensions(container)],
    ['Object.seal', (container) => void Object.seal(container)],
    ['Object.freeze', (container) => void Object.freeze(container)],
  ];

  test.each(lockers)(
    '%s: a merge that would add a name is refused before it replaces one',
    (_, lock) => {
      const base = new DIContainer().add('x', () => 'original');
      lock(base);
      const other = new DIContainer().add('x', () => 'replacement').add('y', () => 'y');

      expect(() => base.merge(other)).toThrow(TypeError);
      // Sealed or non-extensible: refused on the new name. Frozen: refused earlier, on the
      // replacement, since a freeze forbids that too. Either way nothing is written.
      expect(() => base.merge(other)).toThrow(
        /Cannot (add dependency y: the container is not extensible|replace dependency x: the container is frozen)/u,
      );
      expect(base.x).toEqual('original');
      expect(base.has('y')).toBe(false);
    },
  );

  // The three locks keep their platform meaning. `seal` and `preventExtensions` forbid new
  // properties, so they forbid new names and nothing else; `freeze` also forbids writing existing
  // ones, so it forbids replacing a resolver too. Resolution writes into the cache behind the state
  // symbol, which no lock reaches, and is never refused.
  test.each([
    ['Object.seal', (container: object) => void Object.seal(container)],
    ['Object.preventExtensions', (container: object) => void Object.preventExtensions(container)],
  ])('%s: a merge that only replaces existing names still works', (_, lock) => {
    const base = new DIContainer().add('x', () => 'original');
    lock(base);
    const other = new DIContainer().add('x', () => 'replacement');

    expect(base.merge(other).x).toEqual('replacement');
    expect(base.update('x', () => 'updated').x).toEqual('updated');
  });

  test('Object.freeze: a replacing merge is refused before anything is written', () => {
    const base = new DIContainer().add('x', () => 'original').add('y', () => 'y');
    expect(base.x).toEqual('original');
    Object.freeze(base);
    const other = new DIContainer().add('y', () => 'replacement y').add('x', () => 'replacement x');

    expect(() => base.merge(other)).toThrow(TypeError);
    expect(() => base.merge(other)).toThrow(
      'Cannot replace dependency y: the container is frozen — a frozen container resolves but takes no new or replaced dependencies',
    );
    expect(base.x).toEqual('original');
    expect(base.y).toEqual('y');
  });

  test('Object.freeze: update is refused and the cached value survives', () => {
    const base = new DIContainer().add('x', () => ({ conn: 'real' }));
    const real = base.x;
    Object.freeze(base);

    expect(() => base.update('x', () => ({ conn: 'fake' }))).toThrow(
      'Cannot replace dependency x: the container is frozen',
    );
    expect(base.x).toBe(real);
  });

  test('Object.freeze: resolution still works, and a clone is unlocked', () => {
    const base = new DIContainer().add('x', () => 'x').add('lazy', () => 'resolved after freeze');
    Object.freeze(base);

    expect(base.lazy).toEqual('resolved after freeze');
    expect(base.hasResolvedDependency('lazy')).toBe(true);
    expect(base.clone().update('x', () => 'on the clone').x).toEqual('on the clone');
  });

  test.each(lockers)('%s: add() fails with the same message and writes nothing', (_, lock) => {
    const base = new DIContainer().add('x', () => 'x');
    lock(base);

    expect(() => base.add('y', () => 'y')).toThrow(
      'Cannot add dependency y: the container is not extensible — was it frozen, sealed or passed to Object.preventExtensions?',
    );
    expect(base.has('y')).toBe(false);
    expect(base.x).toEqual('x');
  });
});
