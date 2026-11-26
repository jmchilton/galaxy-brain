# Review: phases C/D

Acted on in `3352b4d571d`: bug 1 (web process decides `use_cached_jobs` for tool requests; red-to-green integration test), bug 2 (eager panel entry uses `patches_as_dicts`; unit test asserts equality), nits 1 (`indexed_patch_digest` helper, non-XML skipped), 2 (`/api/jobs/search` applies the rule), 3 (config docs), 5 (`global_tool_errors`), 6, 7.

Not acted on:

- Bug 3, eager store-hit fallback drops patch state: low odds; recorded in the debrief.
- Nit 1 versionless pre-16.04 tools: stay unpatchable (no XML version); recorded.
- Nit 4 freshness probe rebuilds the DB: boot-only today; left for hardening.
- Nit 8 Celery-loaded converters unpatched: recorded.
- Nit 9 temp conf dir in one integration class: minor.

<details><summary>Full review</summary>

# Review: phases C/D (Galaxy integration of tool patches)

Range `840bf0faaae..HEAD` (74b4129e886, 1926278349b, 99fba759421, 8d09587db63). Unit tests run: test_populate_store.py, test_cached_tool.py and test_toolbox.py, 207 passed and 2 xpassed. Integration tests not run (coordinator ran them: 9 passed).

**Verdict:** the seam placement, key threading, store/index/manifest plumbing and invalidation are solid. Two real bugs need fixing before handoff:

- the job-cache guard is bypassed on the async tool-request path;
- the `patches` payload shape differs between the eager and cached toolboxes.

Everything else is minor or a nit.

## Bugs

1. **Job-cache guard bypassed on the tool-request API (async/Celery).**
   - Where: `lib/galaxy/webapps/galaxy/services/jobs.py:294-304` and `lib/galaxy/celery/tasks.py:597-606`.
   - `POST /api/jobs` serializes `tool.tool_source.to_string()`. That text is patched, which is good.
   - The Celery worker rebuilds the tool with `cached_create_tool_from_representation`. The rebuilt `Tool.patch` is None, so `handle_input_async` → `completed_jobs` → `patch_blocks_job_cache(None)` gives False.
   - Result: a `special_inputs`/`all_inputs` patch still reuses pre-patch jobs on this path. Workflows (`workflow/modules.py:3520`) and legacy `/api/tools` (`handle_input`) are covered. The integration test only goes through `run_tool` (legacy), so it doesn't catch this.
   - Smallest fix: decide in the web process, which has the patched Tool.
     ```python
     use_cached_jobs=bool(job_request.use_cached_jobs) and not patch_blocks_job_cache(tool.patch),
     ```
   - Alternative: add `patch: ToolPatchInfo | None` to `schema/tasks.py:ToolSource` and set `tool.patch` in `queue_jobs`. This fixes `tool.patch` for any later Celery consumer too.
   - Red test: in `test_tool_patches.py`, a `use_cached_job` run through the tool-request API (`DatasetPopulator` has a tool-request helper) on the `special_inputs` class.

2. **Eager and cached `patches` payloads have different shapes.**
   - Where: `lib/galaxy/tools/__init__.py:3126-3127`.
   - The eager code passes `PatchState` objects into `ToolPanelEntry(**kwargs).model_dump(exclude_unset=True)`. `exclude_unset` recurses into nested models, so every default-valued field of a state is dropped: `upstream`, `reproducibility_doc`, `changes_requirements`, `advisory`, `verified`, `detail`, whichever the engine left unset.
   - `CachedTool.to_panel_entry` (`cached_toolbox.py:505`) emits the full `model_dump(mode="json")`.
   - Verified with a synthetic state. Eager gave `{state, kind, key, collection, path, digest, reproducibility}`; cached gave all 13 keys.
   - Within one cached deployment, `/api/tools` (stub) and `/api/tools/{id}` (materialized → `Tool.to_panel_entry`) disagree as well.
   - Fix (reuses the existing helper). Validating from full dicts marks every field as set, so the output is identical; I verified this.
     ```python
     if (patches := patches_as_dicts(self.patch)) is not None:
         kwargs["patches"] = patches
     ```
   - Red test: in `test_tool_patch_applies_to_keyed_version_only`, assert `patched.to_panel_entry(mock_trans())["patches"] == patches_as_dicts(patched.patch)`. The integration `test_api_reports_patch` checks only four keys that both shapes contain.

3. **(minor) The eager store-hit branch drops patch state.**
   - Where: `lib/galaxy/tools/__init__.py:859-910`.
   - It is reachable only through the `CachedToolBox.create_tool` "parsing eagerly" fallback (`cached_toolbox.py:1323`), when there is no index entry after an ad-hoc populate but `get_by_source_path`/`get_by_tool_id` still hits a stored row.
   - In that case it returns patched content with `Tool.patch=None`: the API shows nothing and the job-cache guard is off. Re-running `apply_patches` would not help, because it yields `already_applied`, which the guard ignores.
   - Low probability, not blocking.
   - Fix: make the fallback really parse from disk and skip the store, for example by factoring the file-parse branch of `get_expanded_tool_source` into a helper that `CachedToolBox` calls there. Alternatively, comment that the stored row's patch state is unknown.

## Nits

1. **Fast-path key can diverge from the apply key.** `populator.py:838-842`.
   - `key_from_ids(entry.id, entry.id, entry.version)` uses the defaulted version: "1.0.0" for versionless pre-16.04 tools (`parse_tool_version_with_defaults`). `patch_key` uses the raw `parse_version()`, which is None there.
   - Non-XML sources are keyed by the fast path but never patched by `apply_patches`.
   - If a file matches either case, the digest is never equal and the tool is re-parsed on every incremental run. Cost only.
   - Fix: return None when `entry.source_class != "XmlToolSource"`. Also either make `patch_key` use the defaulted version (versionless tools then become patchable as 1.0.0, matching what Galaxy reports) or document that they are unpatchable.
   - Reuse: move this into a `tool_patch_digest(db, entry, path)` helper in `galaxy/tools/patches.py`, next to `apply_tool_patches`. One place would then own the key and hint derivation. Today the fast path uses `Path(path).parent` and apply uses `dirname(abspath(path))`.
2. **`/api/jobs/search` is not covered.** `api/jobs.py:590` calls `JobSearch.by_tool_input` directly, so it still reports pre-patch jobs as equivalent.
   - Placing the MVP rule in `Tool.completed_jobs` is fine: it has the Tool, short-circuits before the query, and covers the form, workflows and (after Bug 1) async.
   - The spec put the rule in `JobSearch`, though. Note the gap or apply the same check there; the endpoint already materializes the tool.
3. **Config doc gaps.** `config_schema.yml:1055-1091`, plus the regenerated sample/rst.
   - `tool_patch_reproducibility` doesn't say that an applied patch above `rejects_inputs` disables job-cache reuse for that tool. Admins will see this under the default `all_inputs`.
   - `tool_patch_paths` says "changes need a restart". That is true for eager. Under `use_cached_toolbox`, a toolbox reload builds a new `CachedToolBox` whose probe/populator rebuild the DB from disk, so new collection content reaches stored sources while `app.tool_patches` stays stale. Either document it ("cached toolbox: a toolbox reload re-populates") or have the in-process populate use `app.tool_patches`.
   - The doc doesn't say how relative paths resolve: against cwd, with no `path_resolves_to`.
4. **The freshness probe builds a whole DB on each call.** `freshness.py:96-98`.
   - At boot this is about 3-4 loads in total (app, `index_is_fresh`, populator token, populator DB). Each walks the collection, hashes every patch and coverage file, and re-logs INFO "loaded collection" and any skipped-collection errors.
   - It is boot-only today, because the store watcher has no caller, so it's fine for the MVP.
   - Cheap improvement: a quiet load mode, or memoizing per config id within one populate.
5. **`get_expanded_tool_source` (`tools/__init__.py:857`).** `apply_tool_patches` sits outside the `try`, so a patch-induced parse failure is not recorded in `global_tool_errors` (the admin tool-errors view).
6. **Defensive `getattr` where the attribute always exists.**
   - `getattr(config, "tool_patch_paths", None)` in `tools/patches.py:31`: `PopulateConfig` now defines it.
   - `getattr(tool_source, "patch_state", None)` in `populator.py:546`: declared on `ToolSource`.
   - Use direct access.
7. **Typing.** `apply_tool_patches(..., config_file: Any)` → `StrPath | None`. `tool_patch_paths: list[Any]` → `list[str]`, if the attributes file isn't generated.
8. **Celery converters.** Converters loaded by `registry.load_datatype_converters_without_toolbox` (Celery) skip patching, so `Tool.patch` is unset there. Low impact, since the job command is built in the handler from the patched toolbox. Worth one line in the debrief, since the spec said converters can't diverge.
9. **Temp dir leak.** `TestToolPatchAlreadyApplied` writes its conf into a `tempfile.mkdtemp()` that is never removed. Minor.

## Checked clean

- **Imports** are top level, with no new cycles. `galaxy.tools.patches` imports only `tool_util` and `version`, and `tool_util.toolbox.entry` → `tool_util.patches.model` is fine.
- **Thread-safety.** Populator threads share the DB, and the collection and changeset locks cover the shared caches. App-level DB use is read-mostly.
- **Key derivation is consistent across the two call sites** for shed guids (`entry.id` = guid), `_local` tools, data managers (conf guid on both paths) and converters (local key, eager through `toolbox.load_tool`).
- **Invalidation.** The fast path re-parses on any change to patch files, codes, coverage, policy, series or collection order. The freshness-token write order is safe: the token is computed before the DB loads, so a mid-run change leads to a re-populate.
- **Read-only stores** are never patched, because the populator writes only writable stores. Logging compares summaries per member, and `load_index` is cached, so there is no second parse.
- **`reload_tool_by_id`** passing the guid and repository is a genuine red-to-green test. The tool_version workaround is understood.
- **Tests are not weakened.** The pure test expectations changed only to fold in `codes.yml`. The new tests are meaningful: the re-patch case counts stored/unchanged, the freshness case checks four distinct tokens, and the job cache is checked both ways. `test_materialized_tool_carries_entry_patch` is close to trivial but the spec asks for it.
- **Not covered, and acceptable:** a unit test for the read-only logging, and the spec's `to_json` `patches` field. The latter is the tool form; defer to the UI phase, but say so.

</details>
