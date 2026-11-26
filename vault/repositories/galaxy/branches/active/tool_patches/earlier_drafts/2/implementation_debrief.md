# Implementation debrief

```
created .../tool_patches/differential-review/snapshots/20261126T033947Z-hardening-1e92a2575484.json
  hardening @ 1e92a2575484 vs origin/dev (merge-base ce63095e7a8a)
  since 20261126T024853Z-revision-cc4712bc0720:
    commits: 20 same, 0 rebased, 0 changed, 5 new, 0 dropped
```

**STATUS: READY.** Head `1e92a257548` on `jmchilton/tool_patches`, 25 commits on `origin/dev`. The baseline tests commit `daeb3750f0c` comes first.

## What it is

- **The engine.** `galaxy.tool_util.patches` is a pure engine.
  - Patch files are validated by pydantic with load-time lint, and duplicate YAML keys are rejected.
  - There are four ops (`replace_text`, `replace_element`, `add_element`, `remove_element`), each with an exact `occurrences`. Each op is classified POST first, then PRE.
  - Units are per kind (security, then compat), each atomic and reporting `applied | already_applied | mismatch | skipped`.
  - `needed_from` gates units on the series. Ops and an advisory can share a file. Site policy demotes patches to generated advisories.
  - Patches stack across collections. Each collection uses scandir with Go-style segment encoding. Per-changeset override files are chosen from `.hg/dirstate` (v1 and v2), can be symlinks inside the collection root, and fall back to the version file.
  - `verified` comes from `coverage/`. A parameter-model guard rejects patches that change the tool's parameters.
  - Digests cover file contents, `codes.yml`, `coverage/`, the policy, the series and `ENGINE_VERSION`.
- **Galaxy wiring.**
  - Config: `tool_patch_paths` (default `[]`), `tool_patch_reproducibility` (default `ordinary_inputs`) and `tool_patch_requirement_changes` (default false).
  - One database per process. `app.tool_patches`, the populator and the freshness probe share it, and changes take effect on restart.
  - Eager seam: `get_expanded_tool_source`. With patches configured, store rows aren't served there.
  - Store seam: the populator's `process_tool`. The fast path checks the patch digest, and the freshness token folds in collection tokens.
  - State is carried as `ToolIndexEntry.patch` and `ToolIndex.tool_patch_collections`, plus the manifest's `tool_patches`. `--tool-patch-path` is available.
  - `Tool.patch` and `patches` on panel entries come from the index for cached stubs.
  - `reload_tool_by_id` keeps the shed guid.
  - Job-cache skip for applied patches above `rejects_inputs`, enforced in `Tool.completed_jobs`, the tool-request service and `/api/jobs/search`.
  - A boot and per-populate summary line is logged.

## Choices worth a reviewer's eye

- **Spec bullets superseded by dated decisions.**
  - Ops and an advisory may share a file, so the old "fails to load" test bullet was dropped.
  - A compat unit that `needed_from` gates out reports `skipped`; it isn't silent.
- **Restart-only semantics.** Processes running different collections disagree on the freshness token while a rolling restart is in progress. The store flips between them until every process has restarted. Live reload, in phase 2, is the fix.
- **Engine.**
  - For `remove_element`, the selector-invariance check expects `before − occurrences` matches.
  - The parameter-model guard is skipped when the profile and `<inputs>` are byte-identical (the perf fix). It counts as unknown, rather than blocking, when the pre-image can't be modelled.
- **Not accepted from the prototype format.** `script_sha256` and `param_model` are rejected by `extra="forbid"`. Such files load unpatched rather than silently losing a guard.
- **Level rename** (John, 2026-11-25): `unusual_inputs` and `ordinary_inputs`, with no aliases.
- **`INDEX_SCHEMA_HASH` changes** even with the feature off, so publishers need a parallel bundle.
- **Pre-existing issues seen along the way.** Neither is fixed here.
  - `safe_element_identifier` raises `TypeError` on a dataset name containing `'`. That's why the fixture uses a dot.
  - A same-version `register_tool` keeps the old default `_tools_by_id` entry.

## Hardening

- Normal reviews: `subagents/review_phase_ab.md`, `review_phase_cd.md` and `review_rescope.md`, all acted on.
- Test challenges were run twice; the second run is fresh. Earlier drafts are in `earlier_drafts/1/`.
- Performance challenge: one fix, the parameter-model skip.
- Thermo-nuclear review was run twice.
- Baseline refactor: none possible.
- Scope evaluations:
  - Round 1: expand. Re-scoped, with the alt `tool_patches_alt_original_scope` at `4ec188d7a21`.
  - Round 2: keep.
- Codex was blocked by the permission classifier; see `codex_review.md`.
- Check-branch: `make format` and mypy are clean. The one remaining mypy error, in `managers/notification.py`, already exists on dev.
- Tests:
  - Unit: 1408 passed, 1 skipped, 2 xpassed. `test_watcher` fails on clean dev as well.
  - `test/integration/test_tool_patches.py`: 12 passed, run alone. It covers the eager toolbox, the cached toolbox, `already_applied` and the job-cache rule on all three paths.

## Decisions for John

- **Split the PR?** The scope evaluation lists six options. The most natural one is engine + eager first, then the store.
- **Split `test_tool_patches.py`?** It is 1,309 lines.
- **Counters.** Where should the patch-state counters live, and should patch counts go into the populator's returned stats?
- **API payload.** Should `/api/tools` list payloads get a compact `patches` form? Today the field adds 0.6–1.6 KB per matched tool.
- **Skipped compat units.** Should a `skipped` compat unit also drop that file's compat advisory?
- **Writable named stores.** Should they take the local patch config, as they do today?
- **Celery task schema.** Should `ToolSource` carry `patch`? That would let the worker apply the job-cache rule itself instead of the web process deciding.

## Out of scope (follow-ups)

Admin endpoint, tool-form badge, `Job.tool_patch` column with the precise cache rule, live reload/watch, authoring CLI, shipped patches, `tool_patch_exclude`.
