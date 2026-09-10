import { configureDI } from './__helpers__/readmeExtend.js';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';

test('README extend example matches the compiled fixture', () => {
  const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
  const fixture = readFileSync(new URL('./__helpers__/readmeExtend.ts', import.meta.url), 'utf8');
  const example = readme.split('<!-- example:extend -->')[1]?.split('```ts\n')[1]?.split('```')[0];

  expect(example).toBe(fixture.replace("from '../../index.js'", "from 'rsdi'"));
});

test('README extend example awaits initialization and wires both layers', async () => {
  const users = [{ name: 'Grace' }];
  const query = vi.fn().mockResolvedValue(users);
  const createPool = vi.fn().mockResolvedValue({ query });
  const container = await configureDI(createPool);

  expect(createPool).toHaveBeenCalledOnce();
  expect(query).not.toHaveBeenCalled();
  expect(container.has('databasePool')).toBe(true);
  expect(container.has('userRepository')).toBe(true);
  expect(await container.userService.listUsers()).toBe(users);
  expect(query).toHaveBeenCalledWith('SELECT * FROM users');
});
