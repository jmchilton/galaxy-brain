# Review: `issue_210_datatypes_snapshot` (a0476900..519e956e)

Reviewed commit: `519e956e` ("workflow-graph: committed Galaxy datatypes snapshot"). Reviewer: Opus 5.5, medium effort, read-only.

## Verdict

The approach is sound and close to mergeable. A subpath export plus a generated TS module is the right shape for ESM, browser and webpack consumers. I built it: `dist/datatypes-snapshot*.d.ts` is under 500 B, because the explicit type annotation avoids `as const` bloat. The 250 KB of JS lands only behind `./datatypes-snapshot`, `sideEffects: false` is already set, and the root index does not import it. Two things should be fixed before merging:

1. **The sync is not reproducible.** A same-day re-fetch reorders roughly 95% of the inner maps (verified below).
2. **The docs and the test comment explain the client/server divergence wrongly.** They miss the real and much larger quirk: `subclass="true"` name collisions make 285 extensions mutual subtypes.

There is no security concern.

## Real issues

### P2 1: `make sync-datatypes` output is nondeterministic, so a re-sync churns ~4k lines (implementation verified)

Galaxy builds `class_to_classes[n] = dict.fromkeys(types, True)` from a Python `set` (`lib/galaxy/managers/datatypes.py:47-52`). The inner key order therefore depends on hash randomization in each worker process. I fetched `https://usegalaxy.org/api/datatypes/types_and_mapping?upload_only=false` today, the same day as the snapshot, and compared it with the committed snapshot:

- `datatypes` order, `ext_to_class_name` order and the outer `class_to_classes` keys are all identical.
- **499 of 527** inner `class_to_classes` maps have a different key order.
- After sorting the keys, the data is identical.

So re-running the sync with no real upstream change rewrites most of the file and its sha. Real datatype changes then get buried in the diff. `fetchedAt` adds a little more churn on every run.

Suggested fix: canonicalize in `scripts/sync-datatypes.mjs`, and optionally skip the write when the data is unchanged.

```diff
 const version = await getJson("/api/version");
-const typesAndMapping = await getJson(PATH);
+const raw = await getJson(PATH);
+// Inner class_to_classes order comes from a Python set; sort so re-syncs only diff on real changes.
+const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
+const typesAndMapping = {
+  datatypes: raw.datatypes,
+  datatypes_mapping: {
+    ext_to_class_name: raw.datatypes_mapping.ext_to_class_name,
+    class_to_classes: Object.fromEntries(
+      Object.entries(raw.datatypes_mapping.class_to_classes).map(([k, v]) => [k, sortKeys(v)]),
+    ),
+  },
+};
```

`datatypes` order can stay as served, since `DatatypesMapperModel` sorts a copy. A cheap test could pin the canonical form, e.g. assert that every inner map's keys are sorted. That test would also give the sha gate (nit 1 below) something real to protect.

### P2 2: The docs and test comment misattribute the client/server divergence and omit the real one

`docs/packages/workflow-graph.md` says:

> Galaxy names `subclass="true"` datatypes and auto-compressed variants after their parent class (e.g. `galaxy.datatypes.registry.Text`), so `isSubType("fastqsanger.gz", "fastqsanger")` is true.

The test comment says "Client-side mapping names compressed variants after their parent class." Both claims are wrong:

- **Compressed variants get unique class names.** `fastqsanger.gz` maps to `galaxy.datatypes.registry.FastqSangerGz`, created by `type(name + "Gz", (datatype_class, GzDynamicCompressedArchive), ...)` at `registry.py:392`. `FastqSanger` really is a base class, so `fastqsanger.gz` being a subtype of `fastqsanger` is true on the server too. It is not a client artifact.
- **The client-only divergence is the `subclass="true"` collision.** `registry.py:271` runs `type(datatype_class_name, (datatype_class,), {})`. On the server, each extension gets a distinct class with `__module__ == "galaxy.datatypes.registry"` and the parent's `__name__`. `view_mapping` keys classes by `f"{c.__module__}.{c.__name__}"`, so every `subclass="true"` sibling of the same parent collapses into one client class name. In this snapshot, **24 `registry.*` classes are shared by 285 extensions**. Verified with the built mapper:
  - `isSubType("markdown", "source.py") === true`, and the reverse is true too. The same holds for `rmd` and `source.c`.
  - `registry.Binary` covers `hep.root`, `bai`, `arrow`, `cxb`, `gz`, `las`, … so `bai`, `gz` and `las` are all mutual subtypes.
  - `registry.Json` covers `anvio_state`, `d3_hierarchy`, `freq.json`, `hivtrace`, `mzqc`, …
  - Server-side `issubclass` would say False for all of these pairs.

This matters beyond documentation. The child branch's kind checks will inherit these false accepts. A `bai` output wired into a `las` input will look acceptable. That is faithful to Galaxy's editor, but it should be a stated, tested limitation and not a surprise.

Suggested doc fix:

```diff
-The snapshot has the client's semantics, not the server's. Galaxy names `subclass="true"` datatypes and auto-compressed variants after their parent class (e.g. `galaxy.datatypes.registry.Text`), so `isSubType("fastqsanger.gz", "fastqsanger")` is true. Implicit conversions are not modeled.
+The snapshot has the client's semantics, not the server's. Galaxy's mapping keys classes by `module.ClassName`, and every `subclass="true"` datatype becomes `galaxy.datatypes.registry.<Parent>`, so siblings collapse into one class: `isSubType("markdown", "source.py")` and `isSubType("bai", "las")` are both true here, though the server treats them as distinct. Auto-compressed variants are real subclasses (`fastqsanger.gz` → `registry.FastqSangerGz`, a `FastqSanger` subclass). Implicit conversions are not modeled.
```

Suggested test change: fix the comment and pin the quirk, so a Galaxy-side fix shows up on re-sync.

```diff
     ["fastqsanger", "fastqsanger.gz", false],
-    // Client-side mapping names compressed variants after their parent class.
+    // Compressed variants subclass their base type.
     ["fastqsanger.gz", "fastqsanger", true],
+    // Known Galaxy quirk: subclass="true" siblings share `registry.<Parent>`, so they are mutual subtypes client-side.
+    ["markdown", "source.py", true],
+    ["bai", "las", true],
   ])("isSubType(%s, %s) is %s", (child, parent, expected) => {
```

Upstream note: this looks like a Galaxy bug candidate in `view_mapping`, `lib/galaxy/managers/datatypes.py:33-53`. Possible fixes are keying `subclass="true"` classes by extension, or setting a distinct `__qualname__` in `registry.py`. It is out of scope here, but worth an issue on Galaxy if the kind checks are meant to be trusted.

## P3 / smaller

### P3 1: Argument parsing in the sync script is fragile

- `--galaxy-url` with no value crashes with `TypeError: Cannot read properties of undefined (reading 'replace')`.
- `--galaxy-url=https://usegalaxy.eu` is **silently ignored**, and the script fetches usegalaxy.org instead.

The Makefile uses the space form, so `make` users are fine. `node:util` `parseArgs` handles both forms and errors on a missing value:

```diff
-const urlFlag = process.argv.indexOf("--galaxy-url");
-const galaxyUrl = (urlFlag >= 0 ? process.argv[urlFlag + 1] : "https://usegalaxy.org").replace(
-  /\/+$/,
-  "",
-);
+import { parseArgs } from "node:util";
+const { values } = parseArgs({ options: { "galaxy-url": { type: "string", default: "https://usegalaxy.org" } } });
+const galaxyUrl = values["galaxy-url"].replace(/\/+$/, "");
```

### P3 2: `GALAXY_URL ?=` in the Makefile picks up the environment

`?=` lets an exported `GALAXY_URL` win. Developers who work on Galaxy often export it for a local server, and then `make sync-datatypes` silently snapshots `localhost:8080`. The snapshot's `source.galaxyUrl` would reveal it, but only if someone looks. A scoped name avoids this:

```diff
-#   make sync-datatypes GALAXY_URL=https://usegalaxy.eu
+#   make sync-datatypes DATATYPES_GALAXY_URL=https://usegalaxy.eu
 DATATYPES_SNAPSHOT_DST = packages/workflow-graph/src/datatypes-snapshot.generated.ts
-GALAXY_URL ?= https://usegalaxy.org
+DATATYPES_GALAXY_URL ?= https://usegalaxy.org
 
 sync-datatypes:
-	node scripts/sync-datatypes.mjs --galaxy-url "$(GALAXY_URL)"
+	node scripts/sync-datatypes.mjs --galaxy-url "$(DATATYPES_GALAXY_URL)"
```

The docs line `GALAXY_URL=...` would need the same rename.

### P3 3: The sync script does not check the response shape and has no timeout

The `DatatypesCombinedMap` annotation in the generated file catches wrong types at typecheck time, which is good. It does not catch an empty `datatypes` array, or an `ext_to_class_name` entry with no matching `class_to_classes` entry; the test catches the reverse direction. Add a small assertion before writing, e.g. non-empty `datatypes` and every class present in `class_to_classes`, plus `fetch(url, { signal: AbortSignal.timeout(60_000) })`.

## Nits

1. **The sha256 gate is weak.** It catches hand edits that bypassed the script. Git diff and `prettier --check` already make those visible. It does not show that the file matches any server, and with P2 1 unfixed it cannot detect real changes. It is harmless and consistent with `verify-user-tool-source-schema`, so keeping it is fine. The two verify recipes are now near-identical inline `node -e` blobs. A shared `scripts/verify-sha256.mjs <file> <shaFile> <syncTarget>` would remove the duplication, and the next generated artifact would reuse it rather than copy it a third time.
2. **The tests include some near-trivial ones.** `"is memoized"` and `"records where it was fetched from"` mostly restate the implementation and the generated data. `"is not exported from the package index"` checks only key names. It would miss a side-effect import of the generated module from `index.ts`, which is the bundle-cost concern that actually matters. A stronger version greps `src/` for imports of `datatypes-snapshot.generated` outside `datatypes-snapshot.ts`, or loads `dist/index.js` and asserts the module isn't in the graph. The `isSubType` table and the two `producesAcceptableDatatype` cases are the valuable part.
3. **The generated JS is a large object literal.** It is a 250 KB literal. `export const DATATYPES_SNAPSHOT = JSON.parse('…')` parses faster in V8 for payloads of this size. This is optional; the load is lazy and happens once.
4. **TypeDoc probably skips the subpath.** `typedoc.json` uses `entryPointStrategy: "packages"`, which typically documents only the package's main entry. Unless `packages/workflow-graph` gets its own `typedoc.json` with `entryPoints: ["src/index.ts", "src/datatypes-snapshot.ts"]`, the subpath won't appear in the API docs. Not verified with a docs build.
5. **`DATATYPES_SNAPSHOT` is mutable and shared with the memoized mapper.** A consumer that mutates `typesAndMapping` changes `snapshotDatatypesMapper()` for everyone. A `Readonly`/`DeepReadonly` annotation in the generated header would prevent this at the type level without inflating the d.ts.

## Naming and upstream-ability

- **Naming fits Galaxy.** Galaxy's client uses `getDatatypesMapper(upload_only)`, `typesAndMappingResponse` (test fixture) and `testDatatypesMapper`. `DATATYPES_SNAPSHOT.typesAndMapping` and `snapshotDatatypesMapper()` match that vocabulary, and the constructor argument is named `typesAndMapping` in both codebases. No change needed.
- **The upstreamable abstraction is still `DatatypesMapperModel(DatatypesCombinedMap)`**, which already exists. This branch adds a data source, not a new abstraction, which is appropriate.
- **The snapshot won't drop into Galaxy as-is.** Galaxy's own fixtures are two raw JSON files (`client/tests/test-data/json/datatypes.json` and `datatypes.mapping.json`, joined in `client/src/components/Datatypes/test_fixtures.ts`). A TS module wrapped in `source` metadata doesn't fit there. If upstreaming the snapshot (not just the model) is a goal, the sync script could also emit those two canonical JSON files. Galaxy's fixtures could then be refreshed by the same script, which would be a real shared tool.
- **The P2 2 collision is the most upstream-relevant finding.** It is a Galaxy bug that both clients faithfully inherit.

## Checked and fine

- **Exports map:** `./datatypes-snapshot` has `types` and `import` conditions, matching `.`. Node16 ESM is fine, and webpack or esbuild (the VS Code extension) resolve subpath exports.
- **Build output:** `dist/datatypes-snapshot.generated.js` is 250 KB, plus a 97 KB source map. The docs' "~250 KB" is accurate.
- **`.d.ts` size:** both files are under 500 B.
- **`sideEffects: false`:** already present, and the module-level `let mapper` is lazy, so it is not a side effect.
- **Snapshot integrity:** every `datatypes` entry maps to a class, every class has a `class_to_classes` entry, and the extension sets match exactly.
- **Checks run:** `make verify-datatypes-snapshot` passes, and `vitest run test/datatypes-snapshot.test.ts` passes (13 tests).
- **Changeset:** present, `minor`.
- **Security:** no concerns. The URL is supplied by the developer, and the output goes through `JSON.stringify`, so there is no code-injection path.
