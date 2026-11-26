# Initial implementation debrief

```
created .../tool_patches/differential-review/snapshots/20261126T013729Z-implementation-8d09587db633.json
  implementation @ 8d09587db633 vs origin/dev (merge-base ce63095e7a8a)
  first snapshot: 8 commits, 41 files, 74 hunks
```

## What was built

- `daeb3750f0c` **Baseline tests.** `reload_tool_by_id` keeps shed identity; incremental populate re-parses a changed file and carries the unchanged one.
- `e02b9b68bb8`, `8b8010227f2`, `840bf0faaae`: **pure package `galaxy.tool_util.patches`**.
  - `model`: pydantic patch files with load-time lint.
  - `engine`: four ops, POST-first guard, atomic per-kind apply, idempotence, selector-invariance and parameter-model checks.
  - `keys`: Go-style segment encoding.
  - `collection` and `database`: scandir index, lazy locked parse, stacking, `needed_from` gate, policy demotion to generated advisories, `verified` from `coverage/`, per-changeset overrides from `.hg/dirstate` (v1 and v2).
  - `builtin` collection, empty.
- `74b4129e886` **Eager seam.**
  - Config options `tool_patch_paths`, `tool_patch_reproducibility` (default `all_inputs`) and `tool_patch_requirement_changes` (default false).
  - `app.tool_patches` is loaded once.
  - Patching happens in `get_expanded_tool_source` (file-parse branch only).
  - `Tool.patch` and `ToolPanelEntry.patches` carry the result.
  - `reload_tool_by_id` passes the guid and repository.
  - Job-cache skip in `Tool.completed_jobs` for applied patches above `rejects_inputs`.
- `1926278349b` **Integration tests** with the fixture collections `test/functional/tool_patches/{identifier_single,identifier_single_validator}` and `identifier_single_fixed.xml`.
- `99fba759421` **Review fixes** (see `subagents/review_phase_ab.md`).
- `8d09587db63` **Store seam.**
  - The populator patches before storing.
  - The fast path compares the entry patch digest.
  - The index carries `ToolIndexEntry.patch` and `ToolIndex.tool_patch_collections`, and the manifest carries `tool_patches`.
  - The freshness token folds in collection digests and policy.
  - `--tool-patch-path` added.
  - Cached stubs report `patches` without materializing, and materialized tools take the entry state.
  - Read-only stores are logged and never re-patched.
  - `INDEX_SCHEMA_HASH` pin updated.

## Decisions and deviations

- **Ops and an advisory may share a file** (John's later decision). It supersedes the old test bullet that said such a file must fail to load.
- **Per-kind units.** Security ops apply first, then compat. A compat unit fully gated out by `needed_from` reports `skipped`, rather than reporting no state.
- **`remove_element` selector invariance** expects `before − occurrences` matches after the op.
- **The parameter-model guard** ignores validators and sanitizers. It treats a pre-image that can't be modelled as unknown and doesn't block.
- **Series** comes from `galaxy.version.VERSION_MAJOR`, which is already the next series on dev. Galaxy passes it into tool_util.
- **Override filenames** are matched as a prefix of the dirstate node, 12 hex digits or more. A mixed override whose compat unit mismatches keeps its security fix; it falls back to the version file only when its security unit (or, if it has none, its compat unit) mismatches.
- **Digests** are computed from file contents, plus `codes.yml` and `coverage/`. `collection.yml`'s `digest` field is never trusted.
- **`patches` API field.**
  - It is on the panel entry payload, so it reaches `/api/tools`, `/api/tools/{id}` and `to_json`, and it appears only when a patch file matched.
  - The stub check uses `CachedTool.to_panel_entry`, because `CachedTool.to_dict` materializes by design.
- **`script_sha256` and `param_model`** from the prototype format are rejected by `extra="forbid"`. Files using them load unpatched. This is an MVP gap: rejecting is better than silently dropping a guard.
- **The integration fixture uses a dot, not a quote.** The default sanitizer maps `'`, and with a `'` in a dataset name, the stock `identifier_single`'s `$input1.safe_element_identifier` raises `TypeError` in `filesystem_safe_string`. That is a pre-existing bug on dev, independent of patches; worth its own issue.
- **The eager toolbox's store-hit branch** (`_get_tool_source_from_store` under `use_cached_toolbox`) doesn't set `Tool.patch`. The cached toolbox sets it from the index entry instead.
- **Same-version re-registration.** `reload_tool_by_id` re-registers a same-version tool without replacing the `_tools_by_id` default (a pre-existing `register_tool` quirk), so the reload test looks the tool up by version.
- **Not built:** a separate unpatched integration class (the `already_applied` class covers byte-identical source); the admin endpoint, badge, `Job` column, live reload, authoring CLI and shipped patches (out of scope).

## Tests

- **Unit:** `test/unit/tool_util/test_tool_patches.py` 172 passed. The broader `test/unit/app/tools`, `test/unit/scripts/tool_source` and `test/unit/tool_util/toolbox` run gave 1404 passed. The only failure is `test_watcher.py::test_watcher`, which fails on clean dev too (environmental).
- **Integration:** `test/integration/test_tool_patches.py`, 9 passed, run alone. It covers the eager toolbox, the cached toolbox, `already_applied` and both job-cache rules.
- **Red checks:** the reload-keeps-patch test fails without the reload change, and the re-patch-on-patch-change test fails without the fast-path digest.
- **Lint and types:** ruff, black and isort are clean. `mypy` (from `lib/`) is clean for the new code; the one remaining error is pre-existing in `managers/notification.py`.
