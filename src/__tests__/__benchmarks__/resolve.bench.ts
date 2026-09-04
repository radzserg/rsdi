// What a container costs per use: repeated cache hits, then the one-time factory + `Proxy` cost.
import { DIContainer } from '../../DIContainer.js';
import { Bar, Foo } from '../__helpers__/fakeClasses.js';
import {
  buildIndependentChain,
  buildLinkedChain,
  keysOf,
  resolveAll,
  resolveRoot,
  sink,
} from '../__helpers__/syntheticGraph.js';
import { bench, describe } from 'vitest';

// A cache hit is below tinybench's timer overhead, so rows batch; `hz` is batches/sec.
const BATCH_SIZE = 1_000;

const CHAIN_SIZE = 100;

const SMALL_KEYS = ['name', 'bar', 'foo'] as const;

const PROBE_KEYS = ['name', 'missing', 'bar', 'absent'] as const;

const UNDEFINED_KEYS = ['undefinedA', 'undefinedB', 'undefinedC'] as const;

describe(`cached resolution (×${BATCH_SIZE.toLocaleString()} per sample)`, () => {
  const container = new DIContainer()
    .add('name', () => 'hello')
    .add('bar', () => new Bar())
    .add('foo', ({ bar, name }) => new Foo(name, bar))
    .add('undefinedA', () => undefined)
    .add('undefinedB', () => undefined)
    .add('undefinedC', () => undefined);

  const large = buildLinkedChain(CHAIN_SIZE);

  const largeKeys = keysOf(CHAIN_SIZE);

  // Warm the cache; first calls belong to the group below.
  container.get('foo');
  for (const key of UNDEFINED_KEYS) {
    container.get(key);
  }
  resolveAll(large, CHAIN_SIZE);

  // The name has to vary per iteration. Asking for one fixed key leaves the call loop-invariant,
  // and V8 hoists it clean out of the batch — which made a 4x speedup read as a 1.6x regression.
  bench('get()', () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = container.get(SMALL_KEYS[index % SMALL_KEYS.length]);
    }
  });

  // Should track `get()`; a gap means the getter stopped forwarding.
  bench('property access', () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = container[SMALL_KEYS[index % SMALL_KEYS.length]];
    }
  });

  // A cached `undefined` takes the fallback own-key check; keep it separate from the ordinary-hit
  // row so an optimization of the common path cannot hide a regression in this supported case.
  bench('get() — cached undefined', () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = container.get(UNDEFINED_KEYS[index % UNDEFINED_KEYS.length]);
    }
  });

  // Mix hits and misses: feature-detection code normally probes both, and fixed all-hit input can
  // make a branch look cheaper than it is in use. Like the `get` rows, the name varies so the
  // operation cannot become loop-invariant.
  bench('has() — mixed registered and missing names', () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = container.has(PROBE_KEYS[index % PROBE_KEYS.length]);
    }
  });

  bench('hasResolvedDependency() — mixed cached and missing names', () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = container.hasResolvedDependency(PROBE_KEYS[index % PROBE_KEYS.length]);
    }
  });

  bench(`get() — ${CHAIN_SIZE}-dependency container`, () => {
    for (let index = 0; index < BATCH_SIZE; index++) {
      sink.value = large.get(largeKeys[index % CHAIN_SIZE]);
    }
  });
});

describe(`first resolution of ${CHAIN_SIZE} dependencies`, () => {
  // `add` mutates and values stay cached, so each sample wires its own. Subtract to price resolution.
  bench('wire only (baseline)', () => {
    sink.value = buildIndependentChain(CHAIN_SIZE);
  });

  bench('wire + resolve — factories take no dependencies', () => {
    resolveAll(buildIndependentChain(CHAIN_SIZE), CHAIN_SIZE);
  });

  // Resolve from the root rather than in registration order. Both orders cross the `Proxy` once
  // per factory, but only this one keeps the full chain in the cycle-detection Set at once — the
  // shape an application gets when it asks for its top-level service.
  bench('wire + resolve root — linked factories use the context proxy', () => {
    resolveRoot(buildLinkedChain(CHAIN_SIZE), CHAIN_SIZE);
  });
});
