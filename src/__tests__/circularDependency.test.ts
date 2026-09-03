import { DIContainer } from '../DIContainer.js';
import { CircularDependencyError } from '../errors.js';
import { describe, expect, test } from 'vitest';

// A factory that reads a name registered *after* it sees `{}` at its own link in the chain, so the
// forward reference has to be typed loosely. The cycle is a runtime fact the types cannot see.
type Deps = Record<string, unknown>;

describe('circular dependencies', () => {
  // Before the in-flight set this was `RangeError: Maximum call stack size exceeded`, which names
  // nothing — a factory reading a dependency whose factory reads it back recursed until V8 gave up.
  test('a direct cycle is reported with its path', () => {
    const container = new DIContainer().add('a', ({ b }: Deps) => b).add('b', ({ a }: Deps) => a);

    expect(() => container.get('a')).toThrow(new CircularDependencyError(['a', 'b', 'a']));
  });

  test('the path starts at the name asked for, so the entry point is visible', () => {
    const container = new DIContainer()
      .add('entry', ({ a }: Deps) => a)
      .add('a', ({ b }: Deps) => b)
      .add('b', ({ c }: Deps) => c)
      .add('c', ({ a }: Deps) => a);

    expect(() => container.get('entry')).toThrow(
      new CircularDependencyError(['entry', 'a', 'b', 'c', 'a']),
    );
  });

  test('a dependency on itself is a cycle of one', () => {
    const container = new DIContainer().add('self', ({ self }: Deps) => self);

    expect(() => container.self).toThrow(new CircularDependencyError(['self', 'self']));
  });

  test('property access reports the same cycle as get()', () => {
    const container = new DIContainer().add('a', ({ b }: Deps) => b).add('b', ({ a }: Deps) => a);

    expect(() => container.b).toThrow(new CircularDependencyError(['b', 'a', 'b']));
  });

  // The in-flight set has to be released in `finally`. Left behind after a throw, the next `get`
  // of the same name finds it still "resolving" and reports a cycle that does not exist.
  test('a factory that throws does not leave a phantom cycle behind', () => {
    let attempts = 0;
    const container = new DIContainer().add('flaky', () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('first call fails');
      }

      return 'second call succeeds';
    });

    expect(() => container.get('flaky')).toThrow('first call fails');
    expect(container.get('flaky')).toEqual('second call succeeds');
  });

  test('a diamond is not a cycle', () => {
    const container = new DIContainer()
      .add('leaf', () => ({ value: 1 }))
      .add('left', ({ leaf }) => ({ leaf }))
      .add('right', ({ leaf }) => ({ leaf }))
      .add('root', ({ left, right }) => ({ left, right }));

    const root = container.get('root');
    expect(root.left.leaf).toBe(root.right.leaf);
  });

  test('a cycle is reported again on the next attempt, not swallowed', () => {
    const container = new DIContainer().add('a', ({ b }: Deps) => b).add('b', ({ a }: Deps) => a);

    expect(() => container.get('a')).toThrow(CircularDependencyError);
    expect(() => container.get('a')).toThrow(CircularDependencyError);
    expect(container.hasResolvedDependency('a')).toBe(false);
  });

  test('two containers do not share in-flight state', () => {
    const cyclic = new DIContainer().add('a', ({ b }: Deps) => b).add('b', ({ a }: Deps) => a);
    const cloned = cyclic.clone();

    expect(() => cyclic.get('a')).toThrow(CircularDependencyError);
    expect(() => cloned.get('a')).toThrow(new CircularDependencyError(['a', 'b', 'a']));
  });
});
