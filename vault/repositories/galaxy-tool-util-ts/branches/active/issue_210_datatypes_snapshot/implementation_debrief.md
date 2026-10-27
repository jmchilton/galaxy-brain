# Implementation debrief — `issue_210_datatypes_snapshot`

Phase A of the [#210 plan](../../../issues/wip/210/plan.md). The shared abstraction already existed (`DatatypesCombinedMap` → `DatatypesMapperModel` → `producesAcceptableDatatype`, ported from Galaxy's client in Tier 1); this branch only adds a data source: a committed usegalaxy.org `types_and_mapping?upload_only=false` snapshot behind the `./datatypes-snapshot` subpath, `snapshotDatatypesMapper()`, `make sync-datatypes` and a sha256 gate in `make check`.

Red→green: `packages/workflow-graph/test/datatypes-snapshot.test.ts` failed on module-not-found, then passed.

Decisions taken as defaults (open questions for John in the plan):
- "main" read as usegalaxy.org; offline `GALAXY_ROOT` registry dump documented in research, not built (usegalaxy.org ⊂ dev sample conf).
- Subpath of `workflow-graph`, not a new `@galaxy-tool-util/datatypes` package (no npm onboarding needed).
- Snapshot keeps the client's semantics, including Galaxy's `subclass="true"` class-name collision; [draft Galaxy issue](../../../issues/wip/210/galaxy_issue_draft_datatype_mapping_collisions.md) not posted.
- Toy test fixtures kept (verbatim port of Galaxy's tests).

Gate: `make check`, `make test` green at `dd7a4397`. Reviews: [normal](subagents/normal_review.md), [Codex](codex_review.md), [thermo](thermo_nuclear_review.md).
