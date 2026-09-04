// What a container costs to build and reconfigure. `add` writes into the resolver map in place, so
// a chain is linear at runtime even though it stays O(N²) to type-check. The other groups separate
// new-name composition from existing-name replacement, cloning and snapshots.
import { DIContainer } from '../../DIContainer.js';
import {
  buildIndependentChain,
  buildModules,
  resolveAll,
  sink,
  updateAll,
} from '../__helpers__/syntheticGraph.js';
import { bench, describe } from 'vitest';

const CHAIN_SIZES = [100, 200, 400];

const GRAPH_SIZE = 200;

const MODULE_COUNT = 20;

describe('add — a growing chain', () => {
  // Doubling the size should roughly double the time. Anything approaching a quadrupling means a
  // rebuild of the resolver map is back on the `add` path — `resolverMapOwnership.test.ts` pins
  // that deterministically, and is the row to look at first when this one drifts.
  for (const size of CHAIN_SIZES) {
    bench(`chain of ${size}`, () => {
      sink.value = buildIndependentChain(size);
    });
  }
});

describe(`assembling ${GRAPH_SIZE} dependencies`, () => {
  // `compose` and `clone` leave inputs untouched, so these survive reuse.
  const modules = buildModules(GRAPH_SIZE, MODULE_COUNT);

  const built = buildIndependentChain(GRAPH_SIZE);

  bench('one add chain', () => {
    sink.value = buildIndependentChain(GRAPH_SIZE);
  });

  bench(`${MODULE_COUNT} modules, built and composed`, () => {
    sink.value = DIContainer.compose(...buildModules(GRAPH_SIZE, MODULE_COUNT));
  });

  bench(`${MODULE_COUNT} pre-built modules, composed`, () => {
    sink.value = DIContainer.compose(...modules);
  });

  bench('clone a built container', () => {
    sink.value = built.clone();
  });

  bench('export a built container', () => {
    sink.value = built.export();
  });
});

describe(`replacing ${GRAPH_SIZE} dependencies`, () => {
  // Reuse built inputs so these rows price the replacement machinery, not `add`. `updateAll`
  // cycles through every key; a fixed name can become an unrealistically monomorphic fast path.
  const updated = buildIndependentChain(GRAPH_SIZE);
  const merged = buildIndependentChain(GRAPH_SIZE);
  const modules = buildModules(GRAPH_SIZE, MODULE_COUNT);

  bench('update every resolver', () => {
    updateAll(updated, GRAPH_SIZE);
  });

  // The receiver starts populated, so this is the existing-name path from the first sample. That
  // is distinct from the pre-built compose row above, which installs names on a fresh container.
  bench(`${MODULE_COUNT} pre-built modules, merge over existing names`, () => {
    sink.value = merged.merge(...modules);
  });

  // Cached values add real work to snapshots and clones. Keep this setup outside the timed body;
  // otherwise the row would mostly measure resolution rather than copying the second map.
  const resolved = buildIndependentChain(GRAPH_SIZE);
  resolveAll(resolved, GRAPH_SIZE);

  bench('clone a resolved container', () => {
    sink.value = resolved.clone();
  });

  bench('export a resolved container', () => {
    sink.value = resolved.export();
  });
});
