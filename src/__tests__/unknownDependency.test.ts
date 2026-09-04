import { DIContainer } from '../DIContainer.js';
import { DependencyIsMissingError } from '../errors.js';
import { describe, expect, test } from 'vitest';

// The types stop a misspelt name inside one module, but not a name another module is supposed to
// provide — that is a runtime fact of `compose`. The context proxy used to forward the read and hand
// back `undefined`, so the factory built its service around a hole and nothing said so.
type Deps = Record<string, unknown>;

describe('a factory that asks for an unregistered name', () => {
  test('throws instead of receiving undefined', () => {
    const container = new DIContainer().add('mailer', ({ smtpConfig }: Deps) => ({ smtpConfig }));

    expect(() => container.get('mailer')).toThrow(DependencyIsMissingError);
    expect(() => container.mailer).toThrow(DependencyIsMissingError);
  });

  test('names both the missing dependency and the factory that asked', () => {
    const container = new DIContainer()
      .add('mailer', ({ smtpConfig }: Deps) => ({ smtpConfig }))
      .add('notifier', ({ mailer }: Deps) => ({ mailer }));

    expect(() => container.get('notifier')).toThrow(
      new DependencyIsMissingError('smtpConfig', ['notifier', 'mailer']),
    );
    expect(() => container.get('notifier')).toThrow(
      'Dependency resolver with name smtpConfig is not defined; requested while resolving notifier -> mailer',
    );
  });

  test('get() called from inside a factory reports the same path', () => {
    const container = new DIContainer().add('a', (deps) =>
      (deps as unknown as DIContainer).get('nope' as never),
    );

    expect(() => container.get('a')).toThrow(new DependencyIsMissingError('nope', ['a']));
  });

  test('update() of a wrong name from inside a factory reports the same path', () => {
    let container: DIContainer<{ a: string }>;
    container = new DIContainer().add('a', () => {
      container.update('nope' as never, () => 1);

      return 'unreachable';
    }) as unknown as DIContainer<{ a: string }>;

    expect(() => container.get('a')).toThrow(new DependencyIsMissingError('nope', ['a']));
  });

  test('a module composed without the module it depends on fails at resolution, not silently', () => {
    const services = new DIContainer().add('mailer', ({ smtpConfig }: Deps) => ({ smtpConfig }));
    const config = new DIContainer().add('smtpConfig', () => ({ host: 'smtp.example' }));

    expect(() => DIContainer.compose(services).mailer).toThrow(
      new DependencyIsMissingError('smtpConfig', ['mailer']),
    );
    expect(DIContainer.compose(services, config).mailer).toEqual({
      smtpConfig: { host: 'smtp.example' },
    });
  });

  // The trap keys off `undefined`, so these are the cases that must still pass through.
  test('a dependency that resolves to undefined is still readable from a factory', () => {
    const container = new DIContainer()
      .add('nothing', () => undefined)
      .add('wrapper', ({ nothing }) => ({ nothing }));

    expect(container.wrapper).toEqual({ nothing: undefined });
  });

  test('container members and Object.prototype names stay reachable through the context', () => {
    const container = new DIContainer()
      .add('a', () => 'a')
      .add('probe', (deps) => {
        const asContainer = deps as unknown as DIContainer<{ a: string }>;

        return {
          hasA: asContainer.has('a'),
          toString: typeof asContainer.toString,
          viaGet: asContainer.get('a'),
        };
      });

    expect(container.probe).toEqual({ hasA: true, toString: 'function', viaGet: 'a' });
  });

  test('symbol reads still miss quietly', () => {
    const container = new DIContainer().add('probe', (deps) => {
      return (deps as unknown as Record<symbol, unknown>)[Symbol.iterator];
    });

    expect(container.probe).toBeUndefined();
  });
});
