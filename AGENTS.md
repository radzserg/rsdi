# AGENTS.md

Guidance for AI agents working in this repository. Keep this file up to date when workflows change.

## What this is

**RSDI** — a minimal, strongly-typed TypeScript dependency injection container. No decorators, no `reflect-metadata`, **zero runtime dependencies**. Types drive the whole value proposition: resolving a dependency returns its exact inferred type, and misuse is caught at compile time.

The library is **ESM-only** (`"type": "module"`) and ships only compiled output from `dist/`.

## Commands

Use **pnpm** (pinned via `packageManager`; do not use npm/yarn).

| Task                 | Command                                               |
| -------------------- | ----------------------------------------------------- |
| Install              | `pnpm install`                                        |
| Build (emit `dist/`) | `pnpm build` (runs `tsc`)                             |
| Test (unit + types)  | `pnpm test` (`vitest --run --typecheck`)              |
| Single test file     | `npx vitest --run merge` (substring-matches the path) |
| Single test case     | `npx vitest --run -t 'merge containers'`              |
| Lint (check)         | `pnpm lint`                                           |
| Format + autofix     | `pnpm format`                                         |
| Type-cost budgets    | `pnpm bench:types`                                    |
| Runtime benchmarks   | `pnpm bench` (`vitest bench --run`)                   |
| Compare vs last tag  | `pnpm bench:compare` (release step; clean tree)       |

`pnpm lint` runs `oxfmt --check` then `oxlint --type-aware --type-check`; `pnpm format` runs the same two tools in write/`--fix` mode.

Type tests only run when `--typecheck` is passed, so a bare `npx vitest --run` silently skips every `*.test-d.ts` assertion. `pnpm test` includes it; ad-hoc filtered runs need it added back.

There is no separate typecheck script — `pnpm test` runs both runtime tests and type tests in one pass. Always run `pnpm build`, `pnpm test`, and `pnpm lint` before considering a change done; CI (`.github/workflows/ci.yml`) runs `pnpm build` + `pnpm lint` in one job and `pnpm test` across a Node matrix in another, with an aggregate `CI` job as the single required status check.

**Run `pnpm bench:types` too whenever you touch `src/types.ts` or an `add`/`merge`/`compose` signature.** The type tests assert inference at three or four dependencies, which is too small to expose how these types actually fail — both known failure modes pass the full 82-test suite untouched. `scripts/bench-types.mjs` checks the shapes that are big enough, and gates them on instantiation budgets; it runs in CI as the `types-perf` job. Budgets are compiler-specific, so a TypeScript upgrade needs them re-baselined in the same commit. `docs/type-benchmarks.md` explains how to read the report and what to do with each kind of failure.

## Source layout

```
src/
  DIContainer.ts   # the container class (add/get/update/merge/clone/extend/has/…)
  internalState.ts # the INTERNAL_STATE symbol and the InternalState type behind it
  helpers.ts       # registration-time guards: assertResolver, isContainer, readOnlyContext, …
  types.ts         # public + internal type machinery (IDIContainer, Factory, …)
  errors.ts        # typed error classes (exported from index.ts; each sets `name` via new.target)
  index.ts         # public entry point — DIContainer, the six error classes, ContainerSnapshot, IDIContainer, ResolversOf, SealedContainer
  __tests__/
    *.test.ts                     # runtime tests (vitest)
    __typetests__/*.test-d.ts     # TYPE tests (vitest expectTypeOf, needs --typecheck)
    __benchmarks__/*.bench.ts     # runtime benchmarks (vitest bench, needs `pnpm bench`)
    __helpers__/fakeClasses.ts    # shared test fixtures
    __helpers__/syntheticGraph.ts # generated containers for the benchmarks
```

## Architecture

Four small files, but the design is not obvious from any one of them.

### The type and the class are two parallel definitions of the same API

`DIContainer` (in `DIContainer.ts`) is the runtime class. `IDIContainer<R>` (in `types.ts`) is a hand-maintained type describing the same surface. They are not derived from each other.

**Every signature change to a public method must be made in both files.** The class methods return `this as unknown as IDIContainer<…>` — a cast, not a real conversion — so a mismatch does not produce a compile error anywhere in this repo. It silently ships wrong types to consumers, and only a `*.test-d.ts` assertion will catch it.

**A member added to `IDIContainer` must keep `R` out of contravariant positions.** `ContainerLike` accepts `IDIContainer<ResolvedDependencies>`, so every `merge`/`compose` argument has to pass `IDIContainer<{ b: Date }>` → `IDIContainer<Record<string, any>>`. That holds only while `R` appears covariantly (return types, `R[K]`) or inside a parameter of a method, where the double flip makes it covariant again. `export()` returning factories typed `(resolvers: R) => R[K]` put `R` in a parameter of a _returned_ function — one flip — and every widened container silently stopped being a `ContainerLike`: all `merge` and `compose` call sites failed, and `bench-types`' compose scenarios with them. `SnapshotFactory` in `types.ts` uses the method-shorthand bivariance hack for exactly this; `testTypes.test-d.ts` pins that a widened container is still accepted by `merge` and `compose`.

### Types are the product; the runtime is a thin map

`IDIContainer<R> = R & { add, get, merge, … }` — an intersection of the resolver map with the method set. That intersection is what makes `container.foo` typed as `Foo` rather than `any`, and it is why the whole library exists.

Each chained call widens the type parameter: `add('foo', …)` returns `IDIContainer<R & { foo: ReturnType<typeof factory> }>`. The value flowing through the chain is always the same mutated object; only its static type changes at each step.

### Dependency names live in the same namespace as method names

Because of that intersection, a dependency called `get` would shadow the `get` method. Two mechanisms guard this:

- **Compile time** — `DenyInputKeys` / `StringLiteral` in `types.ts` reject non-literal, colliding and reserved names. `ReservedName` is the runtime Set's type-level twin and is derived too: `keyof DIContainer<{}>` is exactly the public methods, plus `constructor`, which every prototype has and `keyof` never lists. Nothing else needs reserving, because everything non-public is symbol-keyed (below). `reservedNames.test.ts` asserts the two sides are equal, and a type test that the union equals the pinned list. Until 3.4.0 the compile-time check covered registered names only, and `add('get', …)` type-checked.

That `Set` is **derived**, built once at module load from the class's prototype:

```ts
const containerMembers = new Set(Object.getOwnPropertyNames(DIContainer.prototype));
```

so adding a public method reserves its name automatically. It was a hand-written list until 3.4.0, and the list was wrong three ways: `export` was missing until a dependency of that name was found to break every `merge`; `setValue` (now `setResolver`) and `addContainerProperty` were explicitly (and wrongly) permitted; and instance fields were never considered at all. Don't put it back. Two things it encodes:

- **Everything non-public is behind one symbol or a static, so it needs no reserving.** `addContainerProperty` defines dependencies as _own_ properties, which shadow the prototype methods the class calls through `this`; a string-keyed private method was therefore at stake too — a dependency named `setResolver` registered fine and made the _next_ `add` throw `TypeError: this.setResolver is not a function` — and string-keyed fields were own properties before any dependency was registered, so `add('resolvers', …)` half-worked. The container now has exactly one field, `[INTERNAL_STATE]`, a plain object holding `resolvers`, `resolvedDependencies`, `resolving` and `context` (symbol and type in `internalState.ts`); the helpers that touch it (`setResolver`, `addContainerProperty`, `assertNameAvailable`, `seedResolvers`, `createState`) are `static`, so they live on the constructor like `compose` and no own property can shadow them, and the pure guards (`assertResolver`, `isContainer`, `readOnlyContext`) are plain functions in `helpers.ts`. `resolvers` and `setResolver` are ordinary dependency names, `Object.getOwnPropertyNames(prototype)` is the public methods and `constructor`, and no throwaway instance is needed. `INTERNAL_STATE` is a `Symbol.for` registry symbol so that containers from two installed copies of rsdi can still `merge` each other, as they could with string keys — which also means it is not a security boundary and was never meant as one. It is exported for the tests only — index.ts does not re-export it and the `exports` map blocks the deep import.
- **Read `DIContainer.prototype`, never `Object.getPrototypeOf(this)`.** A consumer's subclass must not change which names are reserved, because the types describe `DIContainer` alone.

`merge` first checks that each argument _is_ a container — structurally, by the registry symbol, so a container from another copy of rsdi passes — and throws `InvalidContainerError` naming the argument position otherwise; the types admit only containers, so this is for JavaScript consumers, who used to get `Cannot convert undefined or null to object` from inside the loop. It then checks incoming names against the same Set. `add` and `update` already refuse them, so a real container never carries one — but `merge` accepts anything container-shaped at runtime, and installing a getter named `get` turned the first resolution into a stack overflow. One `Set` lookup per incoming name keeps merge linear.

**`addContainerProperty` tells its own getter apart from a foreign own property.** Its `Object.hasOwn` early return is there so a re-registration — `update`, or `merge` of a name already held — does not redefine the getter. It used to fire for _any_ own property: a consumer's `container.cache = …`, a subclass field, a factory writing `deps.scratch = …` through the proxy. Each left the name half-working, `get(name)` running the factory while `container.name` returned the stray. It now asks `has(name)`: a resolver means the property is ours; none means it is foreign, and registration throws `ForbiddenNameError` with a reason before anything is written. That is why `setResolver` and `seedResolvers` wire the getter _before_ writing the resolver — the order is load-bearing, not stylistic. `ownProperties.test.ts` pins it.

Static members (`DIContainer.compose`) live on the constructor, never the instance, so a dependency cannot shadow them and they are correctly absent. Inherited `Object.prototype` names are absent too, and need no reserving — see the next section.

### Both internal maps are null-prototype

The `resolvers` and `resolvedDependencies` maps in the state object are `Object.create(null)`, not `{}`. `get()` reads them with plain property lookups, so with an ordinary object a dependency named after an `Object.prototype` member resolved to the inherited function: `add('toString', () => 'a value')` registered fine and then returned `[Function: toString]`, because `resolvedDependencies.toString !== undefined` short-circuits the cache check.

Guarding each lookup with `Object.hasOwn` would fix it and tax every cache hit; dropping the prototype fixes it and taxes nothing — these maps are built a key at a time and so sit in V8's dictionary mode either way. Measured on the `resolve.bench.ts` rows, the only ones tight enough to judge (rme ±0.15%), it came out slightly _faster_. **Don't reintroduce `{}` for either map**; `reservedNames.test.ts` pins the behaviour.

`export()` is the exception and stays ordinary — its copies are handed to consumers, not used for lookup.

### Mutation is real; immutability is only in the types

`add`, `update`, and `merge` all mutate `this` and return it re-cast — `merge` writes into the state's `resolvers` map and returns `this`. All three check before they write: `merge` validates every incoming name of every container in a first pass — reserved, foreign own property, non-function resolver — and writes in a second, so a refused name leaves `this` untouched instead of half-merged with an eviction that cannot be undone. The key arrays are read once and reused, so it is still linear; `mergeAtomicity.test.ts` pins it. `clone()` and the static `DIContainer.compose()` are the only ways to get a genuinely separate instance; `compose` builds a fresh container and merges each input into it, leaving the inputs untouched.

`clone()` builds a plain `new DIContainer()` and hands it, with the source's maps, to `seedResolvers` — a `protected static`, so a consumer subclass constructor can seed too. It used to go through `ClonedDiContainer`, a hidden subclass whose only job was a constructor that could call the then-instance-level seeding method; a static needs no subclass, and the subclass could not live in its own file anyway (`extends DIContainer` at module top level meets the import cycle in the temporal dead zone). The clone is therefore a `DIContainer`, not an instance of the caller's class. `seedResolvers` throws if the container already has resolvers.

**No two containers may share a resolver map.** `add`, `update` and `merge` write into the state's `resolvers` map in place — that is what keeps a chain linear instead of quadratic — so `seedResolvers` has to copy what `clone()` hands it. Adopting the source's map instead would leak every later registration back into it in both directions. Three tests in `clone.test.ts` pin this; they are the reason the in-place writes are safe.

Those writes cost a chain of 1600 dependencies 196 ms before and 0.6 ms after, so **treat a rebuild of either map as a performance bug, not a style choice.** Wall clock can't guard that in CI, so `resolverMapOwnership.test.ts` asserts the maps keep their identity across `add`, `update`, `merge` and a cached `get` — the same invariant, stated deterministically. A `{ ...this.resolvers }` anywhere on those paths fails there.

**`export()` is the one place that copies on purpose.** Before the in-place writes, `add` replaced the state's `resolvers` map outright, so what `export()` returned was a de-facto snapshot; handing out the live map now would let a caller watch the container change under them and mutate it by writing into what they were given. Nothing inside the class calls it — `clone()` and `merge()` read the protected maps directly, cross-instance — so no internal path pays for the copy. It returns `ContainerSnapshot<R>` and is declared on both the class and `IDIContainer` — it used to be missing from the interface, which made it unreachable once a chain had widened the type, and typed as `Record<string, any>` when it was reached.

### Resolution: lazy, cached, via two access paths

`get(name)` and property access (`container.name`) reach the same cache. Property access is wired by `addContainerProperty`, which `Object.defineProperty`s a getter delegating to `get()` as each resolver is registered.

Factories receive `this.context`, a `Proxy` built in the constructor that forwards property reads back to the container — that is what makes `.add('foo', ({ a, bar }) => …)` destructuring resolve dependencies lazily at call time rather than at registration time.

**The proxy's job is the miss, not the forwarding.** Forwarding alone is what passing `this` would do, and it measured identical on the `resolve.bench.ts` destructuring row. What the trap adds is that a string key the container does not have throws `DependencyIsMissingError` naming the factory that asked, via the `resolving` Set — where a plain read handed back `undefined`. That is the one case the types cannot see: a module's factory destructuring a name another module provides, composed without that module, used to build its service around a hole and say nothing. The trap keys off `undefined` first so a defined read pays nothing extra, and uses `in` (prototype chain included) so a dependency that resolved to `undefined`, the container's methods, and `Object.prototype` names all still pass. Protocol probes the container lacks — `then` from `await deps`, `toJSON` from `JSON.stringify(deps)` — throw; neither is a supported use of the context, and `unknownDependency.test.ts` pins the rest.

**The proxy also makes the context read-only.** Its target is the container, so before the `set`/`deleteProperty`/`defineProperty` traps (and `preventExtensions`/`setPrototypeOf` — without those, `Object.freeze(deps)` froze the container itself and every later `add()` died with `object is not extensible`, and `Object.setPrototypeOf(deps, null)` removed its methods) a factory's `deps.scratch = 42` landed as an own property on the container — surfacing only when a later `add('scratch', …)` was refused for colliding with it — and `deps.a = 2` on a dependency name died with V8's getter-only message. The traps throw a built-in `TypeError` naming the key and the in-flight path, as for a frozen object; it is a bug in a factory rather than something a consumer catches, so no class is exported. `Factory` deliberately does _not_ type its parameter `Readonly<R>`: measured with `bench-types`, that mapped type re-instantiates over the whole resolver map at every `add` link and took the flat 200-chain scenario from 81% to 94% of budget — too much for a compile error on a write the runtime already refuses clearly. Only a write pays at runtime; `readOnlyContext.test.ts` pins it. The internals are also out of a factory's accidental reach: the state is behind a symbol, and the proxy's `ownKeys` trap lists no symbols, so `deps.resolvers` is an unknown name and `Object.getOwnPropertySymbols(deps)` is empty — before that, `deps.resolvers` handed back the live map and a factory could inject a resolver past every check `add` performs. Symbol _reads_ still forward, because the container's own methods reach their state through `this`, which is the proxy when a factory calls `deps.has('a')`. One consequence: calling `add` or `merge` _on the deps object_ from inside a factory throws too, because `addContainerProperty` defines the getter on `this`, which is then the proxy — `hasResolvedDependency.test.ts` used to do exactly that, incidentally, and was changed. `update` through the deps object happens to succeed, since it only writes into the two maps; that is an unguarded path, not a supported one, and mutating the container from a factory is unsupported in every form. If both the miss trap and the write traps are ever removed, remove the proxy with them and pass `this`.

`update()` must delete the cached value for the name it replaces; without that, a container that had already resolved the dependency keeps returning the stale instance. This was a real bug fixed in 3.1.0.

**Dependency getters are non-enumerable, and the symbol-keyed state stays enumerable — both on purpose.** `Object.keys(container)` is therefore `[]` and `{ ...container }` copies only the state object, while Node's `console.log(container)` still shows the resolver keys under `[Symbol(rsdi.internalState)]`, the quickest debug view. Making the getters enumerable would look more honest and is the unsafe choice: spread, rest-destructuring, `Object.assign` and `JSON.stringify` all _invoke_ enumerable getters, so enumerable dependencies would resolve the whole graph eagerly on a `JSON.stringify(container)`, and a factory written `({ ...deps }) => …` would resolve itself and die in `CircularDependencyError`. `export()` is the supported way to inspect a container. Don't flip either.

**`get` caches only if the resolver that ran is still the registered one.** `update` (and `merge`) evict the cache and install the new resolver in one step; when that happened _while the name's own factory was running_ — a factory reaching the container through a closure — `get` then cached the old factory's result as it returned, under the new resolver, and every later request served the stale value. The update was silently lost. One identity comparison before the write, on the miss path only, closes it: the value is still returned to the caller that asked, since that is what ran, and the next request runs the replacement. `updateDuringResolution.test.ts` pins it.

**Cycles are detected on the miss path only.** `get()` keeps the names whose factories are currently running in the state's `resolving` Set, and a name that is asked for while already in flight throws `CircularDependencyError` with the path (`a -> b -> a`) instead of recursing into `RangeError: Maximum call stack size exceeded`. The Set is consulted only after the cache check fails, so cached resolution is untouched; first resolution pays roughly 80 ns per dependency for the `has`/`add`/`delete` — about 15% on the no-dependency `wire + resolve` row of `resolve.bench.ts`, and invisible on the destructuring row where the `Proxy` dominates. Skipping the `has` when the Set is empty was tried and measured no better. The `delete` is in a `finally` on purpose — a factory that throws must not leave its name in flight, or the next `get` reports a cycle that does not exist. It is a `Set`, not an array scanned with `includes`, so that detection stays O(1) at any chain depth. `circularDependency.test.ts` pins all of this.

### `update` is the one method that can't widen lazily

`add` appends with an intersection, which TypeScript never has to normalise. `update` _replaces_, and `{ a: A } & { a: B }` is `A & B` rather than `B` — so it has to rewrite the resolver map, and a rewrite per link makes a chain O(depth × container-size). That tripped `TS2589` at 50 chained calls on a 300-key container, in exactly the shape a test harness produces.

`UpdatedResolvers` in `types.ts` avoids the rewrite in the case that actually chains: when the replacement's type is _mutually assignable_ with the one already registered — a test double for the real service — the container type passes through unchanged. The check has to be mutual, not one-way; one-way would also swallow the subtype case, which is supposed to narrow the container type. `bench-types.mjs`'s `update-chain-80` scenario fails with `TS2589` if the shortcut is removed.

Note this is a _type_-level cost only. The runtime `update()` path is the same in-place `setResolver` write `add` uses, and `resolverMapOwnership.test.ts` covers it.

## Runtime benchmarks

`pnpm bench` runs `src/__tests__/__benchmarks__/*.bench.ts` through `vitest bench`, pricing the runtime claims above: cache hits are flat in container size, wiring is linear, `compose` adds nothing. **Read each group as ratios between its own rows** — wall clock does not transfer between machines, so there are no budgets and no CI job (`docs/type-benchmarks.md` explains why).

**A benchmark body must not repeat one loop-invariant call.** Resolving a fixed name in a batch lets V8 hoist the call clean out of the loop, so the row measures the optimiser instead of the container — that artefact reported a 2.7x speedup here as a 1.6x regression, in both directions, reproducibly. Vary the name per iteration, as `resolve.bench.ts` does.

**`pnpm bench:compare` is the one place these numbers become a verdict.** It builds the last released tag and the current checkout, measures both with _this_ checkout's harness, and reports the deltas; the `/release` skill runs it before the CHANGELOG is written. Two things it encodes that are easy to get wrong by hand:

- **It skips the runtime section when the compiled `dist/*.js` is identical bar comments.** That is a stronger claim than any timing run, and it is how a types-only release avoids reporting noise as a result. The check is `-maxdepth 1` deliberately — `tsc` also emits `dist/__tests__/**`, and folding that in makes every test-only edit look like a runtime change.
- **It alternates the two builds across rounds and keeps the best observation of each.** One unalternated pair is not enough: during development this exact harness reported a confident `+47.6%` regression on `get()`, a path that is roughly 4x _faster_. Two rounds put it at `-26.8%`. `BENCH_COMPARE_ROUNDS` raises it when a flag looks marginal.

**Its runtime half resolves large effects only, and says so.** Rows whose own repeats disagree print as `unstable — not compared`, which means unjudged rather than clean. Even a row that passes the stability check has been seen reporting the wrong sign on a ~35% change while the machine was busy. The deterministic halves — type cost and the compiled-output check — are the actual gate; the timings are a smoke alarm.

## Conventions & gotchas (read before editing)

- **Single quotes, canonical style.** Formatting is owned by `oxfmt` (`.oxfmtrc.json`: single quotes, 2-space indent, 100-col print width, trailing commas); lint rules come from `oxlint-config-canonical` via `oxlint.config.ts`. Do **not** reformat with double quotes. If in doubt, run `pnpm format`. The pre-commit hook (`lint-staged`) runs `oxfmt` on staged `*.{ts,json,md,yml,yaml}` and `oxlint --fix` on staged `*.ts`, so non-conforming formatting gets silently rewritten on commit. Both commands carry `--no-error-on-unmatched-pattern`; without it, a commit touching only files one tool can't handle (JSON for oxlint, `pnpm-lock.yaml` for oxfmt) fails the hook with "no files found".

- **Two different Node versions, on purpose.** `engines.node >=16.9.0` is what the _published_ package needs at runtime; `devEngines.runtime >=22` and `.nvmrc` (26) are what _contributing_ needs. They are unrelated audiences, so the mismatch is correct — don't "fix" it by aligning them. `devEngines` is enforced by npm 11+ and pnpm 11 when installing this repo and ignored when the package is consumed as a dependency.

  Its value is squeezed from three directions, and getting it wrong breaks installs in ways that look nothing like a version problem:
  - **At or above what pnpm itself needs.** pnpm 11.17.0 declares `engines.node >=22.13`, and its launcher hard-exits (`ERROR: This version of pnpm requires at least Node.js v22.13`, exit 1) below that — so a lower `devEngines` would wave through a contributor who then cannot run a single repo command. Re-check this when bumping `packageManager`.
  - **A subset of the range the native bindings declare.** oxfmt, oxlint, and rolldown ship their binaries as optional dependencies with `engines: ^20.19.0 || >=22.12.0`, and pnpm skips an optional dependency unless _every_ version in the declared range satisfies it. `>=22` looks harmless but admits 22.0–22.11, so pnpm silently drops the platform binding — 137 packages install instead of 140 — and every command dies with `Cannot find native binding` / `Cannot find module '@oxfmt/binding-linux-x64-gnu'`. A local install won't reveal it if `node_modules` already exists; reproduce with a clean install in a container.
  - **At or below the lowest entry in the CI test matrix**, or the matrix's own `pnpm install` fails.

  `>=22.13.0` satisfies all three today.

- **The floor is 16.9.0 because of `Object.hasOwn`**, which `DIContainer` uses in four places and which landed in 16.9 — not 16.0. Because development happens on Node 26, nothing about day-to-day work would reveal a newer built-in sneaking in, so two guards exist:
  - `tsconfig` pins `target` and `lib` to `ES2022`, the match for Node 16.9. A post-ES2022 API is then a compile error rather than a runtime failure at a consumer. Raising the floor means raising these together.
  - The `min-node` CI job imports the built package under a `node:<floor>-alpine` container, with the tag derived from `engines.node` so the check can't drift from the declaration. It keeps every component the floor declares — `16.9.0`, not `16.9` — because a partial tag floats to the newest patch in that line and would quietly test above the floor. The script is `scripts/smoke-min-node.mjs`; keep it dependency-free, since it runs against nothing but the floor's built-ins.

  This has gone wrong once already: 3.1.1 shipped `Object.hasOwn` with `engines` unset, and every `has()` call threw for anyone below 16.9.

- **ESM-only, so relative imports carry the `.js` extension** even in `.ts` source (`./types.js`, not `./types`). `moduleResolution` is `NodeNext`.

- **Type tests are real assertions.** In `*.test-d.ts`, always use `expectTypeOf(value).toEqualTypeOf<T>()` (exact equality). Do **not** use the bare `expectTypeOf<T>(value)` form — it only checks assignability and silently misses widened/incorrect types. Type tests run only under `--typecheck` (already wired into `pnpm test`).

- **Keep runtime dependencies at zero.** Never add a `dependencies` entry. Dev-only tooling goes in `devDependencies`.

- **Resolvers are lazy and cached.** `add(name, factory)` registers a factory; it runs once on first `get`/property access, then the result is cached. `add` throws if the name already exists — use `update` to replace (mainly for test mocking). Reserved container method names (`add`, `get`, `merge`, …) cannot be used as dependency names.

- **Composition is the answer to slow type-checking, and it is load-bearing.** A single `.add()` chain of N dependencies costs O(N²) to check (1600 deps ≈ 90 s); the same graph split into modules and combined with `DIContainer.compose()` checks in under a second. `MergedResolvers` in `types.ts` deliberately uses a union-to-intersection fold — a recursive tuple fold trips TS2589 at ~50 containers and silently degrades inference to `never`. Likewise `ResolversOf` must test the `DIContainer` class branch **before** the `IDIContainer` branch, since a class instance also matches `IDIContainer` structurally. Both constraints are covered by type tests; see `docs/type-performance-plan.md` for the measurements.

## Toolchain pins (don't casually bump)

- **Linting is oxlint-only — no ESLint.** `oxlint` + `oxfmt` + `oxlint-config-canonical` replaced the ESLint/prettier stack; type-aware rules need `oxlint-tsgolint` installed (it is a devDependency, invoked via `--type-aware --type-check`).
- **TypeScript is on v7** (the native compiler). `tsc` now ships as a platform-specific Go binary via optional deps, so the lockfile carries every platform's package — don't prune them. `pnpm peers check` reports an unmet `typescript` peer from `@typescript-eslint/utils`, pulled in transitively by `oxlint-config-canonical` → `eslint-plugin-perfectionist`; it is unused (oxlint implements those rules natively) and the warning is safe to ignore.
- **Vitest is pinned exactly** (no `^`) because `--typecheck` is still flagged experimental.
- **pnpm settings live in `pnpm-workspace.yaml`**, not the `pnpm` field in `package.json` (pnpm 11 no longer reads that field). Build scripts are approved via `allowBuilds`.
- pnpm 11 enforces a **supply-chain `minimumReleaseAge` policy**: very freshly published versions can be rejected at install. If an install fails on a just-released package, pin to a slightly older version rather than disabling the policy.

## Publishing

- `prepublishOnly` runs `pnpm build`, so `dist/` is always fresh on publish.
- `files` publishes `dist/**` but excludes `dist/**/__tests__/**` — compiled tests are not shipped. It also ships `docs/ai-agent-guide.md`, so an AI agent working in a consumer's project can read the integration guide straight out of `node_modules`; that file is the only doc that ships, so any link in it to another doc must be an absolute GitHub URL rather than a relative path.
- License is **Apache-2.0** (matches the `LICENSE` file).

- **The package is ESM-only and that is deliberate**, not a limitation — nothing in `src/` requires it (no `import.meta`, no top-level await). CommonJS consumers are not shut out: Node 20.19+ and 22.12+ resolve `require()` of an ESM package, so the effective floor for a CJS consumer is Node 20.19 even though `engines.node` says 16.9. TypeScript CJS consumers need `module: nodenext`; on `Node16` they get `TS1479`. Dual-publishing CJS has been considered and rejected — it doubles the build and invites the dual package hazard, where two loaded copies make `instanceof DIContainer` fail.

- **`exports` condition order is significant.** `types` must stay before `default`, or TypeScript resolves the runtime entry and consumers lose every type. `oxfmt` preserves the order today, but nothing enforces it — if you reorder the block, re-check that a consumer on `moduleResolution: nodenext` still gets inference. The map also blocks deep imports (`rsdi/dist/…` now throws `ERR_PACKAGE_PATH_NOT_EXPORTED`), which is the point: `dist/` layout is not API. `main`/`types` stay alongside it for resolvers that predate `exports`.

## Git / PRs

- Default branch is `main`; branch for changes.
- Commits go through the husky pre-commit hook (lint-staged). Keep changes lint-clean so the hook doesn't rewrite them under you.
