import { DIContainer } from '../DIContainer.js';
import { describe, expect, test } from 'vitest';

// `update` evicts the cache and installs the new resolver at once. When it ran while the name's own
// factory was still executing, `get` then cached that factory's result as it returned — under the
// new resolver — and every later request served the old value. The update was silently lost.
// `get` now caches only if no resolver was registered while the factory ran — a counter, because
// the same function object can be registered again and identity would not notice.
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

  // Both of these re-register the *same* function object, which a resolver-identity check waved
  // through: the eviction `update` performed was undone, or the merged value was overwritten.
  test('update with the same factory still asks for a fresh instance', () => {
    let container: DIContainer<{ a: { n: number } }>;
    let runs = 0;
    const factory = () => {
      runs++;
      if (runs === 1) {
        container.update('a', factory);
      }

      return { n: runs };
    };
    container = new DIContainer().add('a', factory) as unknown as DIContainer<{ a: { n: number } }>;

    const first = container.get('a');
    const second = container.get('a');

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 2 });
    expect(second).not.toBe(first);
    expect(container.get('a')).toBe(second);
  });

  test('a merge carrying the same factory and a resolved value keeps the merged value', () => {
    let container: DIContainer<{ a: string }>;
    let runs = 0;
    let mergeOnThisRun = false;
    const factory = () => {
      runs++;
      if (mergeOnThisRun) {
        mergeOnThisRun = false;
        container.merge(other);
      }

      return `run ${runs}`;
    };
    const other = new DIContainer().add('a', factory);
    expect(other.a).toEqual('run 1');

    container = new DIContainer().add('a', factory) as unknown as DIContainer<{ a: string }>;
    mergeOnThisRun = true;

    // The in-flight run produced 'run 2' and is handed back; the merge that happened inside it
    // copied `other`'s resolved 'run 1' into the cache, and that is what must survive.
    expect(container.get('a')).toEqual('run 2');
    expect(container.get('a')).toEqual('run 1');
    expect(runs).toEqual(2);
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
