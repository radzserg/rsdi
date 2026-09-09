// Guards the two-pass build in `package.json`, which nothing else can see.
//
// `tsconfig` sets `removeComments`, so the first `tsc` pass strips the architecture notes
// in `src/` out of the emitted `.js` — they are for contributors reading this repo, and
// shipping them cost the tarball 32 KB unpacked. But that flag applies to `.d.ts` as well,
// where the same comments are the *consumer's* IntelliSense, so the second pass
// (`tsc --emitDeclarationOnly --removeComments false`) rewrites the declarations with their
// JSDoc intact.
//
// Collapsing that back to a bare `tsc` type-checks clean and passes build, lint, test,
// `bench:types` and the rest of `check:package`, while silently publishing a package whose
// hover docs are gone. This is the check that fails instead. It runs first in
// `check:package`, so it is covered by the `package` CI job and by `release.yml`.
//
// Keep it dependency-free and derived from `src/`: hard-coding which files carry JSDoc
// would go stale the first time one is added or renamed.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const src = join(root, 'src');

const JSDOC = '/**';

// `files` publishes `dist/**` but excludes `dist/**/__tests__/**`, so the compiled tests are
// not part of the contract this checks.
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') {
      return [];
    }
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const failures = [];

try {
  statSync(dist);
} catch {
  console.error('check-emit: dist/ is missing — run `pnpm build` first.');
  process.exit(1);
}

const emitted = walk(dist);

// Half one: the `.js` carries no comments, which is what the first pass buys.
for (const file of emitted.filter((f) => f.endsWith('.js'))) {
  if (readFileSync(file, 'utf8').includes(JSDOC)) {
    failures.push(
      `${relative(root, file)} contains JSDoc — the first \`tsc\` pass should have stripped it ` +
        `(is \`removeComments\` still set in tsconfig.json?)`,
    );
  }
}

// Half two: every source file that documents anything still documents it in the declarations,
// which is what the second pass buys. "At least one" rather than a matching count: a JSDoc on
// something the declarations do not emit is legitimate, and a bare `tsc` takes every file to
// zero, so a presence check is enough to catch the regression without false alarms.
for (const file of walk(src).filter((f) => f.endsWith('.ts'))) {
  if (!readFileSync(file, 'utf8').includes(JSDOC)) {
    continue;
  }
  const declaration = join(dist, relative(src, file).replace(/\.ts$/, '.d.ts'));
  let emittedDeclaration;
  try {
    emittedDeclaration = readFileSync(declaration, 'utf8');
  } catch {
    continue;
  }
  if (!emittedDeclaration.includes(JSDOC)) {
    failures.push(
      `${relative(root, declaration)} lost the JSDoc in ${relative(root, file)} — the second ` +
        `\`tsc --emitDeclarationOnly --removeComments false\` pass did not run`,
    );
  }
}

if (failures.length > 0) {
  console.error('check-emit: FAILED');
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log(`check-emit: OK — ${emitted.length} shipped files`);
