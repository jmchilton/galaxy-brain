# Thermo-nuclear review debrief — `issue_210_datatypes_snapshot`

Reviewed `a0476900..a3494e70` (~200 hand-written lines; the 5k-line generated data judged via its generator). Verdict: structurally sound, no blockers. Acted on all four findings, pushed `a3494e70..dd7a4397`:

- `80095ef1` sync-datatypes: own the checksum gate (`--check`). Makefile blob and duplicate `DATATYPES_SNAPSHOT_DST` path gone.
- `f1f4edb7` sync-datatypes: parallel fetches, guard missing `class_to_classes`, reuse `sortKeys`. Real re-sync byte-identical.
- `e1e284ec` `DatatypesSnapshot` is a hand-written interface; generated file imports it type-only. Regen header-only (same-day usegalaxy.org 26.1.2.dev0 data, sha changed).
- `dd7a4397` isolation test: no other `src/` module imports the snapshot modules (red-verified: key-name test passed with a side-effect import in `index.ts`; new test failed).

No public export renamed. `pnpm build`, `make check`, `make test` green before each commit. Child `issue_210_test_kind_checks` (based on `a3494e70`) needs a rebase onto `dd7a4397`; its own commits don't touch the Makefile, script, or `workflow-graph`, so it should be clean.

Not acted on:
- 5k-line generated file vs the 1k-line rule — generated data behind an isolated subpath; rule targets hand-written sprawl.
- Shared `scripts/verify-sha256.mjs` across the two pre-existing verify targets — still a separate cleanup per normal review; this branch now adds no third copy, so the debt didn't grow.
- Commit raw JSON + `import ... with { type: "json" }` instead of a generated `.ts` (drops prettier from the generator, JSON becomes Galaxy-fixture-shaped) — bigger restructure with Node16/import-attribute and bundler risk; the explicit annotation already keeps the d.ts tiny. Follow-up candidate with the Galaxy upstreaming phase.
- Skip-write when data unchanged (`fetchedAt`/`versionMinor` churn) — a re-sync recording when it was checked is acceptable; revisit if refreshes get scheduled.
- Sha over prettier-formatted bytes couples the gate to prettier output — object-literal formatting is very stable; speculative.
- 97 KB source map for generated data in `dist` — cosmetic package size.
- Readonly snapshot, `JSON.parse` literal, TypeDoc subpath, near-trivial tests — declined in the normal review; no new evidence.

<details><summary>Full review</summary>

## Verdict

Small, well-shaped branch: a data source for the existing `DatatypesMapperModel(DatatypesCombinedMap)` abstraction behind a subpath export, not a new layer. No structural regression, no spaghetti in shared code (the root index is untouched), no file-size explosion in hand-written code. The findings are about where two contracts live — the checksum gate and the snapshot type — both of which leaked out of their owner.

## Findings

### P2 1: Checksum gate lives in a third copy-pasted Makefile `node -e` blob, with a duplicated path

`verify-datatypes-snapshot` is a near-verbatim copy of the two pre-existing verify recipes, and `DATATYPES_SNAPSHOT_DST` duplicates the `DST` constant the script hard-codes. The sync script already writes the `.sha256`; it should own verifying it too. Fix: `node scripts/sync-datatypes.mjs --check` (offline; network path wrapped in `sync()`), Makefile target becomes one line. Distinct from the declined shared-helper refactor: touches only the new target. Red/green by hand: corrupted sha, missing sha, edited generated file all fail with "Re-run make sync-datatypes"; restored passes.

### P3 1: The snapshot's public type contract lives in a template string in the generator

The `{ source: {...}; typesAndMapping }` shape was emitted by `sync-datatypes.mjs` and recovered via `DatatypesSnapshot = typeof DATATYPES_SNAPSHOT`. The generator owned the API type; TypeDoc and readers saw an anonymous type. Fix: `interface DatatypesSnapshot` in `datatypes-snapshot.ts`; generated header is `import type { DatatypesSnapshot } from "./datatypes-snapshot.js"` (type-only cycle, erased at runtime — checked `dist`). Annotation stays in the generated file so its d.ts stays one line.

### P3 2: Generator nits

- `/api/version` and `types_and_mapping` fetched serially; independent → `Promise.all`.
- Shape guard missed `class_to_classes`; a response without it hit `TypeError: Cannot read properties of undefined` (reproduced with a stubbed fetch) instead of the friendly error.
- Outer `class_to_classes` sort re-implemented `sortKeys` inline.

### P3 3: Isolation test checks only export names

"is not exported from the package index" passes when `index.ts` does `import "./datatypes-snapshot.generated.js"` — exactly the bundle-cost regression the subpath exists to prevent. Added a check that no other `src/` module references `./datatypes-snapshot*`.

## Considered and waived

- 5k-line generated file: data, isolated subpath, sorted for reviewable diffs.
- JSON asset instead of generated TS: plausible code-judo (no prettier in generator, Galaxy-fixture-shaped output), but import-attribute support under `module: Node16` plus bundler consumers (VS Code extension) make it riskier than its payoff today.
- Memoized `snapshotDatatypesMapper`: one `let`, used by the child branch; an eager constant would rename a public export.
- Upstreamability: unchanged; `DatatypesMapperModel` remains the shared abstraction.

</details>
