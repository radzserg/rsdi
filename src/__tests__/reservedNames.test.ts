import { DIContainer } from '../DIContainer.js';
import { ForbiddenNameError } from '../errors.js';
import { describe, expect, test } from 'vitest';

describe('reserved dependency names', () => {
  // The guard reads the class itself, so this is close to a tautology by construction — it is
  // here to fail loudly if the derived Set is ever replaced by a hand-maintained list again. A
  // missing entry is not a compile error anywhere: `export` was absent from the old hand-written
  // list until a dependency of that name was found to break every `merge`.
  test('every member of the class is reserved', () => {
    const members = [
      ...Object.getOwnPropertyNames(DIContainer.prototype),
      ...Object.getOwnPropertyNames(new DIContainer()),
    ];

    expect(members.length).toBeGreaterThan(0);

    for (const name of members) {
      expect(() => new DIContainer().add(name as 'notAMethod', () => 1)).toThrow(
        ForbiddenNameError,
      );
    }
  });

  // Why non-public members are reserved too: `addContainerProperty` defines the dependency as an
  // *own* property, which shadows the prototype method the class itself calls through `this`. The
  // registration succeeds and the *next* `add` dies with `TypeError: this.setValue is not a
  // function`. The hand-maintained list explicitly permitted both of these names.
  test.each(['setValue', 'addContainerProperty'])(
    'a dependency named %s cannot break the next add',
    (name) => {
      expect(() => new DIContainer().add(name as 'notAMethod', () => 1)).toThrow(
        ForbiddenNameError,
      );
    },
  );

  // `merge` used to call `export()` on every container passed to it, so a dependency of this name
  // turned any `merge`/`compose` into a `TypeError`. `merge` reads the protected maps directly
  // now, but `export` is still public API, so an own property shadowing it is still a break.
  test('a dependency cannot shadow export', () => {
    expect(() => new DIContainer().add('export' as 'notAMethod', () => 1)).toThrow(
      ForbiddenNameError,
    );
  });

  // Instance fields are own properties before any dependency is registered, so
  // `addContainerProperty`'s `Object.hasOwn(this, name)` early-return skipped wiring the getter.
  // The name registered, `get()` resolved it, and property access handed back the container's own
  // internal map instead. Only a constructed instance reveals these, which is why the guard builds
  // one; a prototype-only check misses all three.
  test.each(['resolvers', 'resolvedDependencies', 'context'])(
    'a dependency named %s cannot shadow the instance field',
    (name) => {
      expect(() => new DIContainer().add(name as 'notAMethod', () => 1)).toThrow(
        ForbiddenNameError,
      );
    },
  );

  // Not reserved, and they do not need to be: both internal maps are null-prototype, so a plain
  // lookup for one of these names misses instead of finding the inherited function. With an
  // ordinary `{}` this returned `[Function: toString]` — `get()` short-circuits on
  // `resolvedDependencies[name] !== undefined`, which an inherited method satisfies.
  test.each(['toString', 'valueOf', 'hasOwnProperty'])(
    'an Object.prototype name resolves to its dependency, not the inherited member',
    (name) => {
      const container = new DIContainer().add(name as 'notAMethod', () => 'a value');

      expect(container.get(name as 'notAMethod')).toEqual('a value');
      expect(container[name as 'notAMethod']).toEqual('a value');
    },
  );

  test('static compose is not reserved — statics never shadow an instance property', () => {
    const container = new DIContainer().add('compose', () => 'a value');

    expect(container.compose).toEqual('a value');
    expect(DIContainer.compose(container).compose).toEqual('a value');
  });
});
