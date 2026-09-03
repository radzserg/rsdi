import { DIContainer, INTERNAL_STATE } from '../DIContainer.js';
import { InvalidResolverError } from '../errors.js';
import { Bar } from './__helpers__/fakeClasses.js';
import { describe, expect, test } from 'vitest';

// The types reject these; JavaScript consumers and `any` casts do not get that help. They used to
// find out at first `get` — `TypeError: resolver is not a function`, naming no dependency — and for
// `null` got a `DependencyIsMissingError` for a name they had just registered.
describe('a resolver that is not a function', () => {
  const values: Array<[string, unknown]> = [
    ['a number', 42],
    ['a string', 'connection-string'],
    ['an object', { host: 'db' }],
    ['null', null],
    ['undefined', undefined],
    ['an array', []],
  ];

  test.each(values)('add() rejects %s at registration', (_, value) => {
    const container = new DIContainer();

    expect(() => container.add('db', value as never)).toThrow(InvalidResolverError);
    expect(container.has('db')).toBe(false);
  });

  test.each(values)('update() rejects %s at registration', (_, value) => {
    const container = new DIContainer().add('db', () => 'real');

    expect(() => container.update('db', value as never)).toThrow(InvalidResolverError);
    expect(container.get('db')).toEqual('real');
  });

  test('the message names the dependency, what was received, and the fix', () => {
    expect(() => new DIContainer().add('db', { host: 'db' } as never)).toThrow(
      'Dependency resolver with name db must be a function, received object; wrap a value as () => value',
    );
    expect(() => new DIContainer().add('db', null as never)).toThrow(
      'Dependency resolver with name db must be a function, received null; wrap a value as () => value',
    );
  });

  // `merge` accepts anything shaped like a container at runtime, so it has to check as well.
  test('merge rejects a non-function resolver from a duck-typed input', () => {
    const duckTyped = {
      [INTERNAL_STATE]: { resolvedDependencies: {}, resolvers: { db: 'connection-string' } },
    } as unknown as DIContainer;

    expect(() => new DIContainer().merge(duckTyped)).toThrow(InvalidResolverError);
    expect(() => DIContainer.compose(duckTyped)).toThrow(InvalidResolverError);
  });

  test('every kind of function is accepted', () => {
    class Service {
      public readonly ready = true;
    }

    const factories = { method: () => new Bar() };

    const container = new DIContainer()
      .add('arrow', () => new Bar())
      .add('declared', function () {
        return new Bar();
      })
      .add('classConstructor', Service as unknown as () => Service)
      .add('method', factories.method);

    expect(container.arrow).toBeInstanceOf(Bar);
    expect(container.declared).toBeInstanceOf(Bar);
    expect(container.method).toBeInstanceOf(Bar);
    expect(container.has('classConstructor')).toBe(true);
  });
});
