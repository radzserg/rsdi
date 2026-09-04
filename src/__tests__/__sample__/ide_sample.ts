import { DIContainer } from '../../DIContainer.js';

export class Bar {
  private readonly isBar = true;
}

export class Foo {
  public bar: Bar;

  public name: string;

  constructor(name: string, bar: Bar) {
    this.name = name;
    if (!name) {
      throw new Error('Name is missing');
    }

    if (!bar) {
      throw new Error('Bar is missing');
    }

    this.bar = bar;
  }
}

// src/__tests__/__sample__/ide_sample.ts
const container = new DIContainer()
  .add('a', () => 123)
  .add('b', ({ a }) => a)
  .add('c', () => 'string')
  .add('bar', () => new Bar())
  .add('foo', ({ bar, c }) => new Foo(c, bar))
  // Property 'd' does not exist on type '{ a: number; b: number; c: string; bar: Bar; foo: Foo; }'.
  .add('foo2', ({ bar, d }) => new Foo(d, bar))
  // TS2345: Argument of type 'Bar' is not assignable to parameter of type 'string'.
  .add('foo3', ({ bar }) => new Foo(bar, bar))
  // Argument of type '"foo3"' is not assignable to parameter of type 'never'.ts(2345)
  .add('foo3', ({ bar }) => new Foo('123', bar))
  // Argument of type 'number' is not assignable to parameter of type 'Bar'.
  .add('foo4', ({ a }) => new Foo('123', a));

const a: number = container.a;
const b: number = container.b;
const c: string = container.c;
const bar: Bar = container.bar;
const foo: Foo = container.foo;

// Property 'z' does not exist on type 'IDIContainer<{ ... }>'.
container.z;

// Argument of type '"y"' is not assignable to parameter of type '"a" | "b" | "c" | "bar" | "foo" | "foo2" | "foo3" | "foo4"'.
container.get('y');
