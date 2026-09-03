import { DIContainer } from '../DIContainer.js';
import { describe, expect, test } from 'vitest';

// `update` evicts the cache and installs the new resolver at once. When it ran while the name's own
// factory was still executing, `get` then cached that factory's result as it returned — under the
// new resolver — and every later request served the old value. The update was silently lost.
// `get` now caches only if the resolver that ran is still the registered one.
describe('replacing a resolver while its factory is running', () => {
  test('update from inside the factory: the running value is returned once, then the replacement', () => {
    let container: DIContainer<{ a: string }>;
    let factoryRuns = 0;
    container = new DIContainer().add('a', () => {
      factoryRuns++;
      container.update('a', () => 'new');

      return 'old';
    }) as unknown as DIContainer<{ a: string }>;

    expect(container.get('a')).toEqual('old');
    expect(container.hasResolvedDependency('a')).toBe(false);

    expect(container.get('a')).toEqual('new');
    expect(container.hasResolvedDependency('a')).toBe(true);
    expect(container.get('a')).toEqual('new');
    expect(factoryRuns).toEqual(1);
  });

  test('update of an outer name from a nested factory is not lost either', () => {
    let container: DIContainer<{ a: string; b: string }>;
    container = new DIContainer()
      .add('b', () => {
        container.update('a', () => 'new a');

        return 'b';
      })
      .add('a', ({ b }) => `old a via ${b}`) as unknown as DIContainer<{ a: string; b: string }>;

    expect(container.get('a')).toEqual('old a via b');
    expect(container.get('a')).toEqual('new a');
    expect(container.get('b')).toEqual('b');
  });

  test('a merge that replaces the running name is not lost', () => {
    let container: DIContainer<{ a: string }>;
    const replacement = new DIContainer().add('a', () => 'from merge');
    container = new DIContainer().add('a', () => {
      container.merge(replacement);

      return 'old';
    }) as unknown as DIContainer<{ a: string }>;

    expect(container.get('a')).toEqual('old');
    expect(container.get('a')).toEqual('from merge');
  });

  test('an unreplaced resolver is still cached', () => {
    let runs = 0;
    const container = new DIContainer().add('a', () => {
      runs++;

      return 'a';
    });

    expect(container.a).toEqual('a');
    expect(container.a).toEqual('a');
    expect(runs).toEqual(1);
    expect(container.hasResolvedDependency('a')).toBe(true);
  });
});
