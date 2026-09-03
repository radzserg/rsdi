import { DIContainer } from '../DIContainer.js';
import { describe, expect, test } from 'vitest';

// The object a factory receives is the container behind a proxy. Without write traps, a write went
// straight through: a new key became an own property on the container — found only when a later
// `add` of that name was refused — and a dependency name hit V8's getter-only `TypeError`.
describe('the dependencies object a factory receives is read-only', () => {
  const asWritable = (deps: unknown) => deps as Record<string, unknown>;

  test('assigning a new key throws and leaves nothing behind on the container', () => {
    const container = new DIContainer().add('writer', (deps) => {
      asWritable(deps).scratch = 42;

      return 'unreachable';
    });

    expect(() => container.writer).toThrow(TypeError);
    expect(() => container.writer).toThrow(
      'The dependencies object passed to a factory is read-only; cannot write scratch while resolving writer',
    );
    expect(Object.hasOwn(container, 'scratch')).toBe(false);
  });

  test('assigning to a dependency name gets the same message, not the getter-only one', () => {
    const container = new DIContainer()
      .add('a', () => 1)
      .add('writer', (deps) => {
        asWritable(deps).a = 2;

        return 'unreachable';
      });

    expect(() => container.writer).toThrow(/read-only; cannot write a while resolving writer/u);
    expect(container.a).toEqual(1);
  });

  test('delete and defineProperty are refused too', () => {
    const container = new DIContainer()
      .add('a', () => 1)
      .add('deleter', (deps) => {
        delete asWritable(deps).a;

        return 'unreachable';
      })
      .add('definer', (deps) => {
        Object.defineProperty(deps, 'b', { value: 2 });

        return 'unreachable';
      });

    expect(() => container.deleter).toThrow(/read-only; cannot delete a while resolving deleter/u);
    expect(() => container.definer).toThrow(/read-only; cannot define b while resolving definer/u);
    expect(container.a).toEqual(1);
  });

  test('the path names every factory in flight', () => {
    const container = new DIContainer()
      .add('inner', (deps) => {
        asWritable(deps).x = 1;

        return 'unreachable';
      })
      .add('outer', ({ inner }) => inner);

    expect(() => container.outer).toThrow(/while resolving outer -> inner/u);
  });

  test('a refused write releases the in-flight state like any other throw', () => {
    let attempts = 0;
    const container = new DIContainer()
      .add('ok', () => 'ok')
      .add('writer', (deps) => {
        attempts++;
        if (attempts === 1) {
          asWritable(deps).scratch = 42;
        }

        return 'second attempt';
      });

    expect(() => container.writer).toThrow(TypeError);
    expect(container.ok).toEqual('ok');
    expect(container.writer).toEqual('second attempt');
  });

  // Registering through the deps object was never supported — the types reject it — and it is a
  // write like any other: `add` defines the new getter on `this`, which is the proxy. The container
  // itself is what to mutate, from outside a factory.
  test('registering a dependency through the deps object is refused', () => {
    const container = new DIContainer().add('registrar', (deps) => {
      (deps as unknown as DIContainer).add('c', () => 'late');

      return 'unreachable';
    });

    expect(() => container.registrar).toThrow(
      /read-only; cannot define c while resolving registrar/u,
    );
    expect(container.has('c')).toBe(false);
  });

  // The read-only traps guard writes *to the deps object*. Its internals used to be reachable past
  // them: `deps.resolvers` handed back the live map, and a factory writing into it bypassed every
  // check `add` performs — no name check, no function check, no getter wired. The internals are
  // symbol-keyed now, and the proxy lists no symbols, so there is nothing to reach.
  test('the internal maps are not reachable through the deps object', () => {
    const container = new DIContainer()
      .add('a', () => 1)
      .add('probe', (deps) => ({
        keys: Object.keys(deps),
        resolvers: (() => {
          try {
            return (deps as Record<string, unknown>).resolvers;
          } catch (error) {
            return (error as Error).name;
          }
        })(),
        symbols: Object.getOwnPropertySymbols(deps).length,
      }));

    expect(container.probe).toEqual({
      keys: [],
      resolvers: 'DependencyIsMissingError',
      symbols: 0,
    });
  });

  // The structural mutations have no property, so the property traps never saw them. They went
  // straight to the container: `Object.freeze(deps)` made it non-extensible before anything could
  // refuse — then tripped the proxy's `ownKeys` invariant — and every later `add()` died with
  // `object is not extensible`; `Object.setPrototypeOf(deps, null)` removed the methods.
  describe('structural mutations are refused and leave the container intact', () => {
    const attempts: Array<[string, (deps: object) => unknown, RegExp]> = [
      [
        'Object.freeze',
        (deps) => Object.freeze(deps),
        /cannot freeze, seal or prevent extensions on it while resolving mutator/u,
      ],
      [
        'Object.seal',
        (deps) => Object.seal(deps),
        /cannot freeze, seal or prevent extensions on it while resolving mutator/u,
      ],
      [
        'Object.preventExtensions',
        (deps) => Object.preventExtensions(deps),
        /cannot freeze, seal or prevent extensions on it while resolving mutator/u,
      ],
      [
        'Object.setPrototypeOf',
        (deps) => Object.setPrototypeOf(deps, null),
        /cannot change its prototype while resolving mutator/u,
      ],
      [
        'Reflect.setPrototypeOf',
        (deps) => Reflect.setPrototypeOf(deps, null),
        /cannot change its prototype while resolving mutator/u,
      ],
    ];

    test.each(attempts)('%s throws and changes nothing', (_, mutate, message) => {
      const container = new DIContainer()
        .add('a', () => 1)
        .add('mutator', (deps) => {
          mutate(deps);

          return 'unreachable';
        });

      expect(() => container.mutator).toThrow(TypeError);
      expect(() => container.mutator).toThrow(message);

      expect(Object.isExtensible(container)).toBe(true);
      expect(Object.getPrototypeOf(container)).toBe(DIContainer.prototype);
      expect(typeof container.get).toBe('function');
      expect(container.add('later', () => 2).later).toEqual(2);
    });
  });

  test('reads are unaffected', () => {
    const container = new DIContainer()
      .add('a', () => 1)
      .add('b', ({ a }) => a + 1)
      .add('probe', (deps) => ({
        hasA: (deps as unknown as DIContainer<{ a: number }>).has('a'),
        keys: Object.keys(deps).length,
      }));

    expect(container.b).toEqual(2);
    expect(container.probe.hasA).toBe(true);
  });
});
