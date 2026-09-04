import { DIContainer } from '../DIContainer.js';
import { ForbiddenNameError } from '../errors.js';
import { describe, expect, test } from 'vitest';

// `addContainerProperty` skips defining the getter when the name is already an own property, so a
// re-registration does not redefine it. That early return used to fire for *any* own property —
// a consumer assignment, a subclass field, a factory writing through the deps object — and left the
// name half-working: `get(name)` ran the factory while `container.name` returned the stray value.
describe('a name already used by a foreign own property', () => {
  const reason = /already has an own property with this name/u;

  test('add() refuses it and leaves the container untouched', () => {
    const container = new DIContainer() as DIContainer & { cache?: string };
    container.cache = 'stray value';

    expect(() => container.add('cache', () => 'from factory')).toThrow(ForbiddenNameError);
    expect(() => container.add('cache', () => 'from factory')).toThrow(reason);
    expect(container.has('cache')).toBe(false);
    expect(container.cache).toEqual('stray value');
  });

  test('a subclass field is refused the same way', () => {
    class App extends DIContainer {
      public logger = 'field';
    }

    const app = new App();

    expect(() => app.add('logger' as never, () => 'from factory')).toThrow(ForbiddenNameError);
    expect(app.has('logger')).toBe(false);
  });

  // A factory writing through the deps object is refused at the write itself now — see
  // readOnlyContext.test.ts — so it can no longer leave a stray property for a later add to find.

  test('merge refuses it too', () => {
    const container = new DIContainer() as DIContainer & { cache?: string };
    container.cache = 'stray value';
    const other = new DIContainer().add('cache', () => 'from factory');

    expect(() => container.merge(other)).toThrow(ForbiddenNameError);
    expect(container.has('cache')).toBe(false);
  });

  // The legitimate own property: the getter this class installed. Both paths that re-register a
  // name must still find it and carry on.
  test('update and merge of an existing name still reuse the getter', () => {
    const container = new DIContainer().add('a', () => 'first');
    expect(container.a).toEqual('first');

    container.update('a', () => 'second');
    expect(container.a).toEqual('second');

    container.merge(new DIContainer().add('a', () => 'third'));
    expect(container.a).toEqual('third');
    expect(container.get('a')).toEqual('third');
  });
});
