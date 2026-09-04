/* eslint-disable no-unused-vars, no-unused-expressions -- intentional IDE sample */
import { DIContainer } from '../../DIContainer.js';
import { Bar, Foo } from '../__helpers__/fakeClasses.js';

const container = new DIContainer()
  .add('a', () => 123)
  .add('b', ({ a }) => a)
  .add('c', () => 'string')
  .add('bar', () => new Bar())
  .add('foo', ({ bar, c }) => new Foo(c, bar))
  // Property 'd' does not exist on type '{ a: number; b: number; c: string; bar: Bar; foo: Foo; }'.ts(2339)
  .add('foo2', ({ bar, d }) => new Foo(d, bar))
  // Argument of type '"foo2"' is not assignable to parameter of type 'never'.ts(2345)
  .add('foo2', ({ bar }) => new Foo(bar, bar));

const a: number = container.a;
const b: number = container.b;
const c: string = container.c;
const bar: Bar = container.bar;
const foo: Foo = container.foo;

// Property 'z' does not exist on type 'IDIContainer<...>'.ts(2339)
container.z;

// Argument of type '"y"' is not assignable to parameter of type '"a" | "b" | "c" | "bar" | "foo" | "foo2"'.ts(2345)
container.get('y');
