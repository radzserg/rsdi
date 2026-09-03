// The error classes are public API: the README and the agent guide tell consumers to catch them by
// class. They have to be importable from the package entry — the `exports` map blocks
// `rsdi/dist/errors.js` — and identifiable once caught.
import {
  CircularDependencyError,
  DenyOverrideDependencyError,
  DependencyIsMissingError,
  DIContainer,
  ForbiddenNameError,
  InvalidResolverError,
} from '../index.js';
import { describe, expect, test } from 'vitest';

type Deps = Record<string, unknown>;

const thrownBy = (action: () => unknown): unknown => {
  try {
    action();
  } catch (error) {
    return error;
  }

  throw new Error('expected the action to throw');
};

describe('error classes', () => {
  const cases: Array<[string, () => unknown, new (...args: never[]) => Error]> = [
    [
      'get() on an unknown name',
      () => new DIContainer().get('nope' as never),
      DependencyIsMissingError,
    ],
    [
      'add() on an existing name',
      () => new DIContainer().add('a', () => 1).add('a' as never, () => 2),
      DenyOverrideDependencyError,
    ],
    [
      'add() on a reserved name',
      () => new DIContainer().add('get' as never, () => 1),
      ForbiddenNameError,
    ],
    [
      'add() with a value instead of a factory',
      () => new DIContainer().add('a', 42 as never),
      InvalidResolverError,
    ],
    [
      'a cycle',
      () =>
        new DIContainer()
          .add('a', ({ b }: Deps) => b)
          .add('b', ({ a }: Deps) => a)
          .get('a'),
      CircularDependencyError,
    ],
  ];

  test.each(cases)(
    '%s is an instance of its class, reachable from the package entry',
    (_, action, ErrorClass) => {
      const error = thrownBy(action);

      expect(error).toBeInstanceOf(ErrorClass);
      expect(error).toBeInstanceOf(Error);
    },
  );

  // `name` used to be inherited as 'Error', so every log line and stack head read
  // `Error: Dependency resolver with name nope is not defined` — the class was invisible.
  test.each(cases)('%s reports its class name, not "Error"', (_, action, ErrorClass) => {
    const error = thrownBy(action) as Error;

    expect(error.name).toEqual(ErrorClass.name);
    expect(error.stack?.split('\n')[0]).toEqual(`${ErrorClass.name}: ${error.message}`);
    expect(String(error)).toEqual(`${ErrorClass.name}: ${error.message}`);
  });

  test('a subclass reports its own name', () => {
    class AppMissingDependency extends DependencyIsMissingError {}

    expect(new AppMissingDependency('x').name).toEqual('AppMissingDependency');
  });
});
