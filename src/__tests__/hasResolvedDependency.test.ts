import { DIContainer } from '../DIContainer.js';
import { describe, expect, test } from 'vitest';

describe('DIContainer hasResolvedDependency', () => {
  test('is true once the dependency has been resolved', () => {
    const container = new DIContainer().add('foo', () => 123);

    expect(container.foo).toEqual(123);
    expect(container.hasResolvedDependency('foo')).toBe(true);
  });

  test('is false for a registered dependency nothing has asked for', () => {
    const container = new DIContainer().add('foo', () => 123);

    expect(container.hasResolvedDependency('foo')).toBe(false);
  });
});
