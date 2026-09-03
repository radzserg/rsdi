import { type ReservedName } from '../../types.js';

// The type-level list of reserved names, pinned from both sides. `satisfies` makes every entry a
// `ReservedName`; the type test asserts the reverse — that `ReservedName` has no member this list
// lacks; and `reservedNames.test.ts` compares the list with the set derived from the class at
// runtime. The three together mean the compile-time and runtime lists can only drift in a way that
// fails a test.
export const RESERVED_NAMES = [
  'add',
  'addContainerProperty',
  'clone',
  'context',
  'export',
  'extend',
  'get',
  'has',
  'hasResolvedDependency',
  'merge',
  'resolvedDependencies',
  'resolvers',
  'resolving',
  'setResolver',
  'setResolvers',
  'update',
] as const satisfies readonly ReservedName[];
