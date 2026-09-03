import { DIContainer, RESOLVED_DEPENDENCIES, RESOLVERS } from '../DIContainer.js';
import { ForbiddenNameError, InvalidResolverError } from '../errors.js';
import { describe, expect, test } from 'vitest';

// `merge` used to check and write one name at a time. When a later name was refused, the earlier
// containers — and the earlier names of the failing one — were already merged into `this`, and a
// cache eviction performed along the way could not be undone. `add` has always checked before
// writing; `merge` now does the same for every incoming name of every container.
describe('merge is all-or-nothing', () => {
  const duckTyped = (resolvers: Record<string, unknown>) =>
    ({ [RESOLVED_DEPENDENCIES]: {}, [RESOLVERS]: resolvers }) as unknown as DIContainer;

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
    ['undefined', undefined, 'argument 1 is a undefined'],
    ['null', null, 'argument 1 is null'],
    ['a plain object', { resolvers: {} }, 'argument 1 is a plain object'],
    ['a string', 'services', 'argument 1 is a string'],
    ['a function', () => 1, 'argument 1 is a function'],
    ['another class', new Date(), 'argument 1 is an instance of Date'],
  ];

  test.each(cases)('%s', (_, value, message) => {
    expect(() => DIContainer.compose(value as DIContainer)).toThrow(TypeError);
    expect(() => DIContainer.compose(value as DIContainer)).toThrow(message);
  });

  test('names the position of the offending argument and writes nothing', () => {
    const base = new DIContainer();
    const good = new DIContainer().add('p', () => 'p');

    expect(() => base.merge(good, undefined as unknown as DIContainer)).toThrow(
      'merge expects containers; argument 2 is a undefined',
    );
    expect(base.has('p')).toBe(false);
  });
});
