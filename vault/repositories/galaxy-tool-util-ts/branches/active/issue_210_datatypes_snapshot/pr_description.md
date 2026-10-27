Groundwork for 🎯 #210 - offline tools can get Galaxy's datatype hierarchy from a committed snapshot of the same API response Galaxy's client reads.

Galaxy's workflow editor decides whether a `bam` can feed a `fasta` input with `DatatypesMapperModel`, built from `GET /api/datatypes/types_and_mapping`. We already ported that model to `@galaxy-tool-util/workflow-graph`, but outside Galaxy there was nothing to build it from — only a five-type toy fixture in its tests. This adds a snapshot of usegalaxy.org's response, so tools can answer datatype questions the way the editor does:

```ts
import { producesAcceptableDatatype } from "@galaxy-tool-util/workflow-graph";
import { snapshotDatatypesMapper } from "@galaxy-tool-util/workflow-graph/datatypes-snapshot";

const mapper = snapshotDatatypesMapper();
mapper.isSubType("fastqsanger", "fastq"); // true
mapper.isSubType("bam", "fasta");         // false
producesAcceptableDatatype(mapper, ["fasta"], ["bam"]).canAccept; // false — same predicate the editor uses
```

**Same abstraction, different source.** Galaxy reads the API; we read disk. Both feed the same `DatatypesCombinedMap` → `DatatypesMapperModel`, so when Galaxy's client adopts `workflow-graph` there's nothing to translate.

***Nothing uses it yet — no validation gets stricter in this PR.*** The first consumer is the stacked `validate-tests` branch; connection validation still ignores datatypes.

***It reproduces the editor's answers, not the server's.*** Galaxy names every `subclass="true"` datatype after its parent class (`galaxy.datatypes.registry.Text`), so in usegalaxy.org's mapping 285 of 799 extensions share 24 class names and siblings collapse: `isSubType("markdown", "source.py")` is true both ways, in the editor and here, though the server treats them as distinct. Implicit conversions aren't modeled — the editor doesn't model them either. Tests pin this behavior.

<details><summary>What's in the branch</summary>

- `packages/workflow-graph/src/datatypes-snapshot.generated.ts` — usegalaxy.org 26.1.2.dev0, 799 datatypes, fetched with the client's own query (`upload_only=false`; the default omits 224 non-upload types). Records server, version and fetch date.
- `@galaxy-tool-util/workflow-graph/datatypes-snapshot` — new subpath export with `DATATYPES_SNAPSHOT`, `DatatypesSnapshot` and a memoized `snapshotDatatypesMapper()`. Not re-exported from the package index, and a test fails if any other `src/` module imports it: consumers that don't ask for it don't bundle the ~250 KB.
- `make sync-datatypes` (network, run periodically; `DATATYPES_GALAXY_URL=` for another server). Galaxy builds the inner `class_to_classes` maps from Python sets, so their key order varies between server processes; the script sorts keys so a refresh diffs only on real changes. It checks the response shape and times out.
- `make verify-datatypes-snapshot` in `make check`: sha256 of the committed file, offline (`sync-datatypes.mjs --check`).
- Docs in `docs/packages/workflow-graph.md`.

</details>

## Risks

Risks are minimal - a new subpath export and a generated data file; nothing existing changes behavior (a two-way door).

<details><summary>Risk Details</summary>

- The snapshot is usegalaxy.org's view: datatypes only installed elsewhere (tool shed, admin config) are unknown to it until someone syncs from that server.
- It goes stale between syncs; refresh is manual.
- Collapsed `subclass="true"` siblings make subtype checks lenient (never stricter than the editor).

</details>

## Context

Part of 🌿[issue_210_test_kind_checks](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_210_test_kind_checks), used to check test `filetype` against workflow input `format`. `@galaxy-tool-util/workflow-graph` minor.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Structurally sound; the sync script now owns its checksum gate and the snapshot type is hand-written.</summary>

Four fixes: `sync-datatypes.mjs --check` replaces a third copy-pasted `node -e` verify block; parallel fetches and a clear error for a malformed response; `DatatypesSnapshot` as a hand-written interface the generated file imports; an isolation test that fails if another `src/` module imports the snapshot (verified it catches a side-effect import the key-name test missed).

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

Codex reviewed the branch with only its goal as context and reported no defects.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
