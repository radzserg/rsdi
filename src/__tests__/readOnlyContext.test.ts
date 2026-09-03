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

    expect(() => container.deleter).toThrow(/read-only; cannot write a while resolving deleter/u);
    expect(() => container.definer).toThrow(/read-only; cannot write b while resolving definer/u);
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
      /read-only; cannot write c while resolving registrar/u,
    );
    expect(container.has('c')).toBe(false);
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
