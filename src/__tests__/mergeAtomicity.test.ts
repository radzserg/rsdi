import { DIContainer } from '../DIContainer.js';
import { ForbiddenNameError, InvalidContainerError, InvalidResolverError } from '../errors.js';
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
    expect(() => DIContainer.compose(value as DIContainer)).toThrow(message);
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
      expect(() => base.merge(other)).toThrow(
        'Cannot add dependency y: the container is not extensible — was it frozen, sealed or passed to Object.preventExtensions?',
      );
      expect(base.x).toEqual('original');
      expect(base.has('y')).toBe(false);
    },
  );

  test.each(lockers)('%s: a merge that only replaces existing names still works', (_, lock) => {
    const base = new DIContainer().add('x', () => 'original');
    lock(base);
    const other = new DIContainer().add('x', () => 'replacement');

    expect(base.merge(other).x).toEqual('replacement');
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
