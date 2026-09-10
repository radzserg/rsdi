import { DIContainer } from '../../DIContainer.js';
import {
  type ContainerSnapshot,
  type ReservedName,
  type ResolversOf,
  type SealedContainer,
} from '../../types.js';
import { Bar, Foo } from '../__helpers__/fakeClasses.js';
import type { RESERVED_NAMES } from '../__helpers__/reservedNames.js';
import { describe, expectTypeOf, test } from 'vitest';

describe('DIContainer typescript type resolution', () => {
  test('if resolves type as given raw values', () => {
    const container = new DIContainer()
      .add('key1', () => 'string')
      .add('key2', () => 123)
      .add('bar', () => new Bar())
      .add('d', () => '' as unknown);
    expectTypeOf(container.get('key1')).toEqualTypeOf<string>();
    expectTypeOf(container.key1).toEqualTypeOf<string>();
    expectTypeOf(container.get('key2')).toEqualTypeOf<number>();
    expectTypeOf(container.key2).toEqualTypeOf<number>();
    expectTypeOf(container.get('bar')).toEqualTypeOf<Bar>();
    expectTypeOf(container.bar).toEqualTypeOf<Bar>();
    expectTypeOf(container.get('d')).toEqualTypeOf<unknown>();
    expectTypeOf(container.d).toEqualTypeOf<unknown>();
  });

  test('it overrides the type', () => {
    const container = new DIContainer().add('a', () => 'string').update('a', () => new Date());

    expectTypeOf(container.a).toEqualTypeOf<Date>();
    expectTypeOf(container.a).not.toEqualTypeOf<string>();
  });

  test('add and update require one literal name on both API definitions', () => {
    const name = Math.random() > 0.5 ? 'a' : 'b';
    const raw = new DIContainer();
    const widened = new DIContainer().add('existing', () => true);

    // @ts-expect-error - only one of these names would be registered
    raw.add(name, () => 1);
    // @ts-expect-error - the widened API must reject the same union
    widened.add(name, () => 1);
    // @ts-expect-error - explicit type arguments must not bypass the check
    raw.add<'a' | 'b', number>('a', () => 1);

    const reservedOrNew = Math.random() > 0.5 ? 'get' : 'newName';
    // @ts-expect-error - filtering a forbidden key must not hide the original union
    raw.add(reservedOrNew, () => 1);
    const existingOrNew = Math.random() > 0.5 ? 'existing' : 'newName';
    // @ts-expect-error - neither may an already registered key hide the union
    widened.add(existingOrNew, () => 1);

    const registered = new DIContainer().add('a', () => 1).add('b', () => 2);
    // @ts-expect-error - only one key would be replaced
    registered.update(name, () => 'text');
    // @ts-expect-error - the class signature must reject the same union
    new DIContainer<{ a: number; b: number }>().update(name, () => 'text');

    const dynamic = String('dynamic');
    // @ts-expect-error - widened strings still cannot register names
    raw.add(dynamic, () => 1);
    // @ts-expect-error - widened strings still cannot update names
    registered.update(dynamic, () => 'text');

    if (name === 'a') {
      expectTypeOf(raw.add(name, () => 1).a).toEqualTypeOf<number>();
      expectTypeOf(registered.update(name, () => 'text').a).toEqualTypeOf<string>();
    }
  });

  // `any` is mutually assignable with everything, so it takes the `UpdatedResolvers`
  // shortcut in both directions. That is a deliberate convention — `update` swaps an
  // implementation, it does not re-type a dependency — and the guard that would change it
  // was measured and rejected; the comment on `UpdatedResolvers` carries the numbers. These
  // pin both directions so a future change to that shortcut has to be a deliberate one.
  test('update does not re-type a dependency through any, in either direction', () => {
    const raw = new DIContainer<{ a: any; untouched: boolean }>();

    // A dependency registered as `any` stays `any`; the repair belongs at its `add`.
    const fromClass = raw.update('a', () => 42);
    expectTypeOf(fromClass.a).toEqualTypeOf<any>();
    expectTypeOf(fromClass.untouched).toEqualTypeOf<boolean>();

    const fromChain = new DIContainer().add('a', (): any => 'old').update('a', () => 42);
    expectTypeOf(fromChain.a).toEqualTypeOf<any>();
    expectTypeOf(fromChain.get('a')).toEqualTypeOf<any>();
    expectTypeOf(fromChain.update('a', (): any => 'new').a).toEqualTypeOf<any>();
    expectTypeOf(raw.update('a', (): unknown => 1).a).toEqualTypeOf<any>();
    expectTypeOf(raw.update('a', (): any => 1).a).toEqualTypeOf<any>();

    // The direction that matters more: an `any` replacement — a test double cast with
    // `as any` — must not erase a concrete dependency's type for everything downstream.
    const typed = new DIContainer().add('repo', () => ({ find: (id: string) => id }));
    const doubled = typed.update('repo', () => ({}) as any);
    expectTypeOf(doubled.repo).toEqualTypeOf<{ find: (id: string) => string }>();
    expectTypeOf(doubled.get('repo')).toEqualTypeOf<{ find: (id: string) => string }>();

    // A replacement that is not mutually assignable still rewrites the map.
    expectTypeOf(
      raw.update('a', (): never => {
        throw new Error('no value');
      }).a,
    ).toEqualTypeOf<never>();
  });

  // `update` passes the container type through untouched when the replacement has the
  // same type, which is what keeps a long override chain from accumulating depth. These
  // pin the inference that shortcut must not cost — see `UpdatedResolvers` in types.ts.
  test('update leaves the other dependencies alone', () => {
    const container = new DIContainer()
      .add('a', () => 'string')
      .add('bar', () => new Bar())
      .update('a', () => new Date());

    expectTypeOf(container.a).toEqualTypeOf<Date>();
    expectTypeOf(container.bar).toEqualTypeOf<Bar>();
    expectTypeOf(container.get('bar')).toEqualTypeOf<Bar>();
  });

  test('update with the same type keeps that type', () => {
    const container = new DIContainer().add('a', () => 'string').update('a', () => 'mock');

    expectTypeOf(container.a).toEqualTypeOf<string>();
    expectTypeOf(container.get('a')).toEqualTypeOf<string>();
  });

  test('update with a subtype narrows the dependency', () => {
    class Animal {
      public legs = 4;
    }
    class Dog extends Animal {
      public bark() {
        return 'woof';
      }
    }

    const container = new DIContainer()
      .add('pet', () => new Animal())
      .update('pet', () => new Dog());

    expectTypeOf(container.pet).toEqualTypeOf<Dog>();
  });

  test('the container stays chainable and typed after an update', () => {
    const container = new DIContainer()
      .add('a', () => 'string')
      .update('a', () => 42)
      .add('foo', ({ a }) => a + 1);

    expectTypeOf(container.a).toEqualTypeOf<number>();
    expectTypeOf(container.foo).toEqualTypeOf<number>();
  });

  test('merge containers', () => {
    const containerA = new DIContainer().add('a', () => 'string');
    const containerB = new DIContainer().add('b', () => new Date());

    const container = containerA.merge(containerB);

    expectTypeOf(container.b).toEqualTypeOf<Date>();
    expectTypeOf(container.a).toEqualTypeOf<string>();
  });

  test('merge several containers in a single call', () => {
    const containerA = new DIContainer().add('a', () => 'string');
    const containerB = new DIContainer().add('b', () => new Date());
    const containerC = new DIContainer().add('c', () => 123);

    const container = containerA.merge(containerB, containerC);

    expectTypeOf(container.a).toEqualTypeOf<string>();
    expectTypeOf(container.b).toEqualTypeOf<Date>();
    expectTypeOf(container.c).toEqualTypeOf<number>();
  });

  test('compose containers', () => {
    const containerA = new DIContainer().add('a', () => 'string');
    const containerB = new DIContainer().add('b', () => new Date());
    const containerC = new DIContainer().add('bar', () => new Bar());

    const container = DIContainer.compose(containerA, containerB, containerC);

    expectTypeOf(container.a).toEqualTypeOf<string>();
    expectTypeOf(container.b).toEqualTypeOf<Date>();
    expectTypeOf(container.bar).toEqualTypeOf<Bar>();
  });

  test('composition preserves alternatives within a single input', () => {
    const a = new DIContainer().add('a', () => 1).add('shared', () => 'text');
    const b = new DIContainer().add('b', () => new Date()).add('shared', () => 42);
    const conditional = Math.random() > 0.5 ? a : b;
    const composed = DIContainer.compose(conditional);
    const merged = new DIContainer().add('base', () => true).merge(conditional);
    const fromClass = new DIContainer().merge(conditional);

    expectTypeOf<ResolversOf<typeof composed>>().toEqualTypeOf<
      ResolversOf<typeof a> | ResolversOf<typeof b>
    >();
    expectTypeOf(composed.shared).toEqualTypeOf<number | string>();
    expectTypeOf(merged.shared).toEqualTypeOf<number | string>();
    expectTypeOf(merged.base).toEqualTypeOf<boolean>();
    expectTypeOf(fromClass.shared).toEqualTypeOf<number | string>();
    // @ts-expect-error - a exists only in one branch
    expectTypeOf(composed.a).toEqualTypeOf<number>();
    // @ts-expect-error - b exists only in the other branch
    expectTypeOf(merged.b).toEqualTypeOf<Date>();
    // @ts-expect-error - get must also require a key present in every branch
    fromClass.get('a');

    const combined = DIContainer.compose(
      new DIContainer().add('base', () => true),
      conditional,
    );
    expectTypeOf(combined.base).toEqualTypeOf<boolean>();
    expectTypeOf(combined.shared).toEqualTypeOf<number | string>();
    if ('a' in combined) {
      expectTypeOf(combined.a).toEqualTypeOf<number>();
    }
  });

  test('add reserves dependency names from every conditional branch', () => {
    const a = new DIContainer().add('a', () => 1);
    const b = new DIContainer().add('b', () => 'text');
    const conditional = Math.random() > 0.5 ? a : b;
    const composed = DIContainer.compose(conditional);
    const merged = new DIContainer().add('base', () => true).merge(conditional);
    const raw = new DIContainer<{ a: number } | { b: string }>();

    // @ts-expect-error - a may already be registered
    composed.add('a', () => 2);
    // @ts-expect-error - b may already be registered
    composed.add('b', () => 'replacement');
    // @ts-expect-error - merging must reserve names from every input branch too
    merged.add('a', () => 2);
    // @ts-expect-error - the other merge branch must also be reserved
    merged.add('b', () => 'replacement');
    // @ts-expect-error - the class signature must enforce the same rule
    raw.add('a', () => 2);
    // @ts-expect-error - the class must check both branches
    raw.add('b', () => 'replacement');

    expectTypeOf(composed.add('fresh', () => true).fresh).toEqualTypeOf<boolean>();
    expectTypeOf(merged.add('fresh', () => true).fresh).toEqualTypeOf<boolean>();
    expectTypeOf(raw.add('fresh', () => true).fresh).toEqualTypeOf<boolean>();
    // @ts-expect-error - adding a new key must not lose the existing branch keys
    composed.add('another', () => true).add('a', () => 2);
    // @ts-expect-error - get still requires a key present in every branch
    composed.get('a');
    // @ts-expect-error - update still requires a key present in every branch
    merged.update('b', () => 'replacement');
  });

  test('composition preserves conditional tuples and empty alternatives', () => {
    const a = new DIContainer().add('a', () => 1);
    const b = new DIContainer().add('b', () => 'text');
    const inputs = Math.random() > 0.5 ? ([a] as const) : ([b] as const);
    const composed = DIContainer.compose(...inputs);
    expectTypeOf<ResolversOf<typeof composed>>().toEqualTypeOf<{ a: number } | { b: string }>();
    // @ts-expect-error - spreading a conditional tuple must not promise both branches
    composed.get('a');

    const optional = DIContainer.compose(Math.random() > 0.5 ? a : new DIContainer());
    // @ts-expect-error - an empty branch cannot supply a
    expectTypeOf(optional.a).toEqualTypeOf<number>();
    expectTypeOf(DIContainer.compose().has('a')).toEqualTypeOf<boolean>();
  });

  test('compose keeps the container chainable', () => {
    const containerA = new DIContainer().add('a', () => '1');
    const containerB = new DIContainer().add('bar', () => new Bar());

    const container = DIContainer.compose(containerA, containerB).add(
      'foo',
      ({ a, bar }) => new Foo(a, bar),
    );

    expectTypeOf(container.a).toEqualTypeOf<string>();
    expectTypeOf(container.bar).toEqualTypeOf<Bar>();
    expectTypeOf(container.foo).toEqualTypeOf<Foo>();
  });

  test('compose accepts a container with no resolvers', () => {
    const containerA = new DIContainer().add('a', () => 'string');

    const container = DIContainer.compose(new DIContainer(), containerA);

    expectTypeOf(container.a).toEqualTypeOf<string>();
  });

  test('compose keeps the declared dependencies of a module', () => {
    const bars = new DIContainer().add('bar', () => new Bar());
    const foos = new DIContainer<{ bar: Bar }>().add('foo', ({ bar }) => new Foo('foo', bar));

    const container = DIContainer.compose(bars, foos);

    expectTypeOf(container.bar).toEqualTypeOf<Bar>();
    expectTypeOf(container.foo).toEqualTypeOf<Foo>();
  });

  test('sealed container keeps the exact dependency types', () => {
    const container = new DIContainer()
      .add('key1', () => 'string')
      .add('key2', () => 123)
      .add('bar', () => new Bar());

    type AppContainer = SealedContainer<typeof container>;
    const sealed = container as AppContainer;

    expectTypeOf(sealed.key1).toEqualTypeOf<string>();
    expectTypeOf(sealed.key2).toEqualTypeOf<number>();
    expectTypeOf(sealed.bar).toEqualTypeOf<Bar>();
    expectTypeOf(sealed.get('key2')).toEqualTypeOf<number>();
  });

  test('sealed container stays chainable', () => {
    const built = new DIContainer().add('a', () => '1').add('bar', () => new Bar());
    const sealed = built as SealedContainer<typeof built>;

    const container = sealed.add('foo', ({ a, bar }) => new Foo(a, bar));

    expectTypeOf(container.foo).toEqualTypeOf<Foo>();
  });

  test('sealed container works for a composed container', () => {
    const bars = new DIContainer().add('bar', () => new Bar());
    const strings = new DIContainer().add('a', () => 'string');
    const composed = DIContainer.compose(bars, strings);

    const sealed = composed as SealedContainer<typeof composed>;

    expectTypeOf(sealed.a).toEqualTypeOf<string>();
    expectTypeOf(sealed.bar).toEqualTypeOf<Bar>();
  });

  // The class and `IDIContainer` are maintained by hand and the class methods return `this` under a
  // cast, so a mismatch between them is not a compile error anywhere but here. `clone()` said
  // `DIContainer<R>` on the class and `IDIContainer<R>` on the interface; only the latter carries
  // the resolver map, so on a subclass instance `clone().foo` did not exist.
  test('clone returns a typed container from the class and from the widened chain', () => {
    class AppContainer extends DIContainer<{ foo: Foo }> {}
    const fromClass = new AppContainer().clone();

    expectTypeOf<ResolversOf<typeof fromClass>>().toEqualTypeOf<{ foo: Foo }>();
    expectTypeOf(fromClass.foo).toEqualTypeOf<Foo>();

    const fromChain = new DIContainer()
      .add('a', () => 'string')
      .add('bar', () => new Bar())
      .clone();

    expectTypeOf<ResolversOf<typeof fromChain>>().toEqualTypeOf<{ a: string } & { bar: Bar }>();
    expectTypeOf(fromChain.a).toEqualTypeOf<string>();
    expectTypeOf(fromChain.add('c', () => 1).c).toEqualTypeOf<number>();
  });

  // `export()` was typed as `ResolvedDependencies` — `Record<string, any>` — and was absent from
  // `IDIContainer`, so it vanished from the type after the first `add`.
  test('export is reachable after add and returns a typed snapshot', () => {
    const container = new DIContainer().add('a', () => 'string').add('bar', () => new Bar());
    const snapshot = container.export();

    expectTypeOf(snapshot).toEqualTypeOf<ContainerSnapshot<{ a: string } & { bar: Bar }>>();
    expectTypeOf(snapshot.resolvedDependencies.a).toEqualTypeOf<string | undefined>();
    expectTypeOf(snapshot.resolvedDependencies.bar).toEqualTypeOf<Bar | undefined>();
    expectTypeOf(snapshot.resolvers.bar).toEqualTypeOf<
      ((resolvers: { a: string } & { bar: Bar }) => Bar) | undefined
    >();
    expectTypeOf<keyof typeof snapshot.resolvers>().toEqualTypeOf<'a' | 'bar'>();
  });

  // The snapshot's factories sit in a return position on `IDIContainer`. Typed with the plain
  // `Factory`, that made the resolver map contravariant and every widened container stopped being
  // a `ContainerLike` — `merge` and `compose` rejected all of their arguments.
  test('a widened container is still accepted by merge and compose', () => {
    const module = new DIContainer().add('a', () => 'string');
    const other = new DIContainer().add('bar', () => new Bar());

    expectTypeOf(DIContainer.compose(module, other).a).toEqualTypeOf<string>();
    expectTypeOf(new DIContainer().merge(module, other).bar).toEqualTypeOf<Bar>();
  });

  // The agent guide promises a reserved name is "rejected at compile time". Until this test, it was
  // not: `DenyInputKeys` excluded registered names only, and `add('get', …)` type-checked.
  test('every reserved name is a compile-time error for add', () => {
    const container = new DIContainer();

    // @ts-expect-error - reserved: public method
    container.add('get', () => 1);
    // @ts-expect-error - reserved: public method
    container.add('merge', () => 1);
    // @ts-expect-error - reserved: public method
    container.add('export', () => 1);

    // Not reserved: the internals are symbol-keyed, so their former names are ordinary.
    expectTypeOf(container.add('resolvers', () => 1).resolvers).toEqualTypeOf<number>();
    expectTypeOf(container.add('setResolver', () => 1).setResolver).toEqualTypeOf<number>();
    // @ts-expect-error - reserved: on every prototype, and never in keyof
    container.add('constructor', () => 1);

    // Not reserved: a static, and Object.prototype names, both by design.
    expectTypeOf(container.add('compose', () => 1).compose).toEqualTypeOf<number>();
    expectTypeOf(container.add('toString', () => 1).toString).toEqualTypeOf<number>();
  });

  // The hand-kept half of `ReservedName` is pinned from both sides: `satisfies` on the helper says
  // every listed name is reserved, this says nothing reserved is unlisted, and reservedNames.test.ts
  // compares the list with the class at runtime.
  test('ReservedName is exactly the pinned list', () => {
    expectTypeOf<ReservedName>().toEqualTypeOf<(typeof RESERVED_NAMES)[number]>();
  });

  test('extend function', () => {
    const containerA = () => {
      return new DIContainer().add('a', () => '1').add('bar', () => new Bar());
    };

    const finalContainer = containerA().extend((container) => {
      return container.add('foo', ({ a, bar }) => {
        return new Foo(a, bar);
      });
    });

    expectTypeOf(finalContainer.a).toEqualTypeOf<string>();
    expectTypeOf(finalContainer.bar).toEqualTypeOf<Bar>();
    expectTypeOf(finalContainer.foo).toEqualTypeOf<Foo>();
  });
});
