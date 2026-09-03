import { type ReservedName } from '../../types.js';

// The type-level list of reserved names, pinned from both sides. `satisfies` makes every entry a
// `ReservedName`; the type test asserts the reverse — that `ReservedName` has no member this list
// lacks; and `reservedNames.test.ts` compares the list with the set derived from the class at
// runtime. Only the public methods and `constructor`: everything non-public is symbol-keyed and
// cannot collide with a dependency name.
export const RESERVED_NAMES = [
  'add',
  'clone',
  'constructor',
  'export',
  'extend',
  'get',
  'has',
  'hasResolvedDependency',
  'merge',
  'update',
] as const satisfies readonly ReservedName[];
