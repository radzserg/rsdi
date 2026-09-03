import { DIContainer } from '../DIContainer.js';
import { ForbiddenNameError, InvalidResolverError } from '../errors.js';
import { Buzz } from './__helpers__/fakeClasses.js';
import { describe, expect, test } from 'vitest';

describe('DIContainer merge containers', () => {
  test('clone container', () => {
    const baseContainer = new DIContainer().add('a', () => 'a');

    const boundedContextA = baseContainer.clone().add('buzz', () => new Buzz('buzzA'));
    // if we clone the container, we can safele define new with the same name
    const boundedContextB = baseContainer.clone().add('buzz', () => new Buzz('buzzB'));

    expect(boundedContextA.buzz.name).toEqual('buzzA');
    expect(boundedContextB.buzz.name).toEqual('buzzB');
  });

  // `add` and `merge` write into the resolver map in place, so a clone that adopted its source's
  // map rather than copying it would leak every later registration in either direction. These
  // three pin that; without the copy in `seedResolvers` they fail.
  test('adding to a clone leaves the original untouched', () => {
    const baseContainer = new DIContainer().add('a', () => 'a');

    baseContainer.clone().add('b', () => 'b');

    expect(baseContainer.has('b')).toBe(false);
  });

  test('adding to the original leaves an existing clone untouched', () => {
    const baseContainer = new DIContainer().add('a', () => 'a');
    const cloned = baseContainer.clone();

    baseContainer.add('b', () => 'b');

    expect(cloned.has('b')).toBe(false);
  });

  test('merging into a clone leaves the original untouched', () => {
    const baseContainer = new DIContainer().add('a', () => 'a');

    baseContainer.clone().merge(new DIContainer().add('b', () => 'b'));

    expect(baseContainer.has('b')).toBe(false);
  });

  test('clone container after dependency resolution', () => {
    const baseContainer = new DIContainer().add('buzz', () => new Buzz('buzzA'));
    // resolve buzz dependency
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const buzz = baseContainer.buzz;

    const boundedContextA = baseContainer.clone();
    const boundedContextB = baseContainer.clone();

    expect(boundedContextA.buzz.name).toEqual('buzzA');
    expect(boundedContextB.buzz.name).toEqual('buzzA');

    boundedContextA.buzz.name = 'buzzB';
    expect(boundedContextA.buzz.name).toEqual('buzzB');
    expect(boundedContextB.buzz.name).toEqual('buzzB');
  });
});

describe('seedResolvers', () => {
  // Protected static, so a subclass constructor can reach it — `clone()` calls it on a fresh
  // container. Seeding a container that already has resolvers would silently merge two maps.
  test('refuses to seed a container that already has resolvers', () => {
    class SeededTwice extends DIContainer {
      public constructor() {
        super();
        SeededTwice.seedResolvers(this, { a: () => 'first' }, { a: 'first' });
        SeededTwice.seedResolvers(this, { a: () => 'second' }, { a: 'second' });
      }
    }

    expect(() => new SeededTwice()).toThrow(
      'Cannot set resolvers on a container that already has resolvers',
    );
  });

  // `seedResolvers` is protected, so a consumer subclass can hand it anything. It used to trust
  // that input: a seeded `get` shadowed the method and the first resolution overflowed the stack, a
  // seeded `42` failed at first `get` with V8's message, and a resolved value with no resolver was a
  // phantom dependency `has()` denied and `get()` returned. It now runs the checks `merge` runs.
  describe('validates what a subclass hands it, before writing anything', () => {
    class Seeded extends DIContainer {
      public static seed(container: DIContainer, resolvers: unknown, resolved: unknown = {}): void {
        DIContainer.seedResolvers(container, resolvers as never, resolved as never);
      }
    }

    test('a reserved name is refused', () => {
      const container = new DIContainer();

      expect(() => Seeded.seed(container, { a: () => 1, get: () => 'shadow' })).toThrow(
        ForbiddenNameError,
      );
      expect(typeof container.get).toBe('function');
      expect(container.has('a')).toBe(false);
      expect(Object.hasOwn(container, 'a')).toBe(false);
    });

    test('a name already used by a foreign own property is refused', () => {
      class WithField extends DIContainer {
        public cache = 'stray';
      }

      const container = new WithField();

      expect(() => Seeded.seed(container, { cache: () => 'from factory' })).toThrow(
        ForbiddenNameError,
      );
      expect(container.cache).toEqual('stray');
    });

    test('a non-function resolver is refused', () => {
      const container = new DIContainer();

      expect(() => Seeded.seed(container, { a: () => 1, b: 42 })).toThrow(InvalidResolverError);
      expect(container.has('a')).toBe(false);
    });

    test('a resolved value without a resolver is refused', () => {
      const container = new DIContainer();

      expect(() => Seeded.seed(container, { a: () => 1 }, { ghost: 'value' })).toThrow(
        'Cannot seed a resolved value for ghost: it has no resolver',
      );
      expect(container.hasResolvedDependency('ghost')).toBe(false);
      expect(container.has('a')).toBe(false);
    });

    test('something other than two maps is refused', () => {
      expect(() => Seeded.seed(new DIContainer(), undefined)).toThrow(
        'seedResolvers expects a resolver map and a resolved-values map',
      );
      expect(() => Seeded.seed(new DIContainer(), {}, null)).toThrow(
        'seedResolvers expects a resolver map and a resolved-values map',
      );
    });

    test('valid input still seeds resolvers and resolved values', () => {
      const container = new DIContainer() as DIContainer<{ a: string; b: string }>;
      Seeded.seed(container, { a: () => 'a', b: () => 'b' }, { a: 'already resolved' });

      expect(container.get('a')).toEqual('already resolved');
      expect(container.get('b')).toEqual('b');
      expect(container.hasResolvedDependency('b')).toBe(true);
    });
  });
});
