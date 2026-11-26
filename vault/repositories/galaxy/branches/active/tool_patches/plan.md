# tool_patches implementation plan

Galaxy MVP of the tool patch database: declarative patch files, keyed by tool guid and version, applied to the macro-expanded XML at tool load. Engine is pure `galaxy.tool_util.patches`; Galaxy calls it at the two load seams.

## Package `lib/galaxy/tool_util/patches/`

- `model.py` — pydantic models.
  - Patch file: `format_version: 1`, `kind: security|compat|mixed`, `upstream`, `needed_from` ("YY.N"), `galaxy_change`, `reproducibility`, `reproducibility_doc`, `reproducibility_reason`, `changes_requirements`, `fixes`, `ops`, `advisory`. `extra="forbid"`.
  - Ops: `replace_text {path, old, new, occurrences}`, `replace_element {path, old, new, occurrences}`, `add_element {parent, new, position, occurrences}`, `remove_element {path, old, occurrences}`, each with optional `kind`, `needed_from`. `occurrences` is a strict positive int.
  - Load-time rules: ops on root identity attrs (`@id`, `@version`, `@profile`, `@tool_type`) and on the root element rejected; `reproducibility_doc` required with ops (all levels); `changes_requirements` must equal "an op touches requirements" (static, selector/fragment text); kind/needed_from/galaxy_change consistency; compat ops `identical`; `reproducibility_reason` required when the level is below the statically proposed level (generator rule: validator-only -> rejects_inputs, sanitizer/command/configfile -> unusual_inputs, else ordinary_inputs); advisory `vulnerable`/`action`/`code` required.
  - Runtime state: `PatchState` (per file and change kind) and `ToolPatchInfo {digest, states}` carried by `ToolIndexEntry.patch`, `Tool.patch`, `tool_source.patch_state`.
- `engine.py` — classify (POST first, then PRE, else NEITHER) and apply ops on an lxml tree; evaluate a file per change kind (security unit first, compat unit on its output), each atomic, each `applied | already_applied | mismatch | skipped`; C14N element comparison; singleton-sibling refusal; selector invariance and idempotence checked after apply (failure -> mismatch); parameter-model guard via `input_models_for_tool_source` with validators ignored (change -> mismatch).
- `keys.py` — Go module-cache path segment encoding/decoding; key from guid (shed host dropped) or `_local/<id>/<version>`.
- `collection.py` / `database.py` — collection directory walk with `os.scandir` (no YAML parse), lazy parse on hit, per-changeset overrides `<version>/@<changeset>.yml` (symlinks resolved with realpath, refused outside the root), collection digest, optional `codes.yml`, `coverage/` for `verified`. Database stacks collections in `tool_patch_paths` order, applies site policy, `needed_from` gate against the running series, exposes `digest_for(key, changeset)` and `apply_patches(tool_source, guid, repository_dir)`.
- `hg.py` — checked-out changeset from `.hg/dirstate` (v1 and dirstate-v2 docket), cached per repo dir, read only when the key has overrides.

## Galaxy integration

- Config: `tool_patch_paths` (list, default `[]`; directories or `builtin`), `tool_patch_reproducibility` (default `ordinary_inputs`), `tool_patch_requirement_changes` (default false).
- `app.tool_patches` loaded once at startup.
- Eager seam: `ToolBox.get_expanded_tool_source` file-parse branch. `Tool.parse` copies `tool_source.patch_state` to `tool.patch`. `reload_tool_by_id` passes the old guid and repository.
- Store seam: populator `process_tool`, between parse and `to_string`. Fast path also compares the entry patch digest. `ToolIndexEntry.patch`, `ToolIndex.tool_patch_collections`, manifest `tool_patches`, freshness token folds collection digests and policy. `populate_store.py --tool-patch-path` (repeatable) overrides config. Materialized cached tools get `tool.patch = entry.patch`.
- API: `patches` in `Tool.to_dict`/`to_json` and `CachedTool.to_panel_entry` (from the index, no materialization).
- Job cache MVP rule: tools with an applied patch above `rejects_inputs` skip job-cache reuse.

## Tests (red to green)

1. `test/unit/tool_util/test_tool_patches.py` — model/lint failures, op states, round trip, add_element counts and singleton refusal, atomicity, keys, stacking, needed_from gate, policy, verified, `to_string()` patched, param-model guard, overrides and dirstate.
2. Source store: populate patches stored source and index entry; incremental re-patch on patch change; freshness token; manifest; schema hash.
3. Cached toolbox: materialized `tool.patch`; stub panel entry reports `patches` without materializing.
4. Eager toolbox: two-version key patches only one; reload keeps patch; no DB -> identical.
5. `test/integration/test_tool_patches.py` with fixture collection `test/functional/tool_patches/` for `identifier_single`, plus `identifier_single_fixed.xml` for `already_applied`, plus job-cache rule.

## Out of scope

Authoring CLI, admin endpoint, tool-form badge, `Job` column, live reload/watch, shipped patches.
