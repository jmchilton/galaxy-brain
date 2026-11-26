Run via Claude Opus at high effort.

# Thermo-nuclear code quality review (re-harden after re-scope)

This is a fresh pass over `git diff origin/dev...HEAD` at `1fffa4251fe`, with extra attention on everything since `4ec188d7a21`. `earlier_drafts/1/thermo_nuclear_review.md` is history only, and its fixes are already in the branch.

**Acted on:** findings 1–4, in one behaviour-preserving commit, `a08b4a59a7b` ("Tidy tool patch seams: store-skip guard, typed memo, pages-source model check"). The patch file format, config option names and the API `patches` field are unchanged.

- **The store skip** now sits in `_get_tool_source_from_store`, next to that method's other guards. `get_expanded_tool_source`'s store line is back to its `dev` shape.
- **The per-config database memo is typed.** It uses a `_Settings` alias, is keyed on `GalaxyAppConfiguration`, unpacks the settings and has no `Any` left.
- **`_model_source`** now reads `<inputs>` through `XmlPagesSource`, the same reader the parameter model uses.
- **Small tidies:**
  - `_policy_bytes` is one join that produces the same bytes.
  - One over-long line in the schema description is rewrapped. Regenerating `galaxy_options.rst` and the sample with `config_manage.py` produced no diff.

**Not acted on:**
- the process-lifetime patch-state counter (NEEDS-DECISION, low priority);
- folding `ENGINE_VERSION` into `ToolPatchCollectionsSummary`;
- carried items #12 (the job-cache rule at three entry points) and #13 (the 1309-line test file).

Earlier item #11 (the patch database built three times at boot) **is resolved** by the re-scope's per-config memo. Reasons for each are below.

**Verification:**
- Unit tests: 571 passed, 2 xpassed. This adds `test/unit/app/tools/test_tool_source_store_selection.py` to the usual set, because its app stub needed `tool_patches=None`.
- `test/integration/test_tool_patches.py` (run alone): 12 passed.
- ruff, black and isort are clean.
- Scoped mypy shows only the existing `managers/notification.py` error.
- Red check: with the moved guard deleted, `test_tool_patches_parse_from_disk_instead_of_unpatched_store_rows` fails with `'Stored Row' == 'Test Tool'`. Restoring the guard makes it pass.

## Not acted on

- **NEEDS-DECISION (low priority): the counters in `ToolPatchDatabase`.** These are `_state_counts`, `_counts_lock`, `state_counts()`, `summary(since=)` and the populator's start snapshot.
  - **The problem:** a shared, memoized domain object now carries mutable logging tallies, and the snapshot-and-subtract API has a single caller. A toolbox reload in another thread during an in-process populate leaks into the "this populate" line. That only makes a log line imprecise, so it doesn't block anything.
  - **Option 1, count from the toolbox:** the toolbox already keeps per-load counters (`_tools_parsed_from_file`, `_tools_loaded_from_store`), so they look like the natural home. But it needs a `CachedTool.patch` forward on a deliberately closed `__slots__` stand-in. On a cached boot with a fresh index, it would also change the boot line from parsed counts to recorded counts, which goes against the wording the re-scope review chose.
  - **Option 2, count from populate results:** this covers only the populate call site. The database counter would stay for the boot line, leaving two mechanisms.
  - **The pure option:** make `summary(states)` a pure function, count from populate results, and count the boot from the index entries or `tool.patch`. That is a small design change to what the log lines report, so John should decide on it.
- **`ENGINE_VERSION` is folded twice,** once in `_policy_bytes` for the per-tool digest and once in `token()`. Putting it in `ToolPatchCollectionsSummary` would encode it once, and would make the read-only store mismatch log notice engine bumps. But that changes the persisted index and manifest shape and the `INDEX_SCHEMA_HASH` pin. Not worth it for one integer.
- **#12, carried: the job-cache rule is checked at three entry points.** These are `Tool.completed_jobs`, `/api/jobs/search` and the tool-request service. The status is unchanged since `earlier_drafts/1`: they are distinct entry points, and the only change that would remove one is a Celery `ToolSource` task schema change.
- **#13, carried NEEDS-DECISION: `test/unit/tool_util/test_tool_patches.py` is a new 1309-line file.** It was 1266 lines before the re-scope. It could split mechanically along its `# ---` sections into a `test/unit/tool_util/patches/` package. That changes the test path that every debrief and verification command names.
- **#11, resolved.** `tool_patch_database_from_config` memoizes per config object and settings, so `app.tool_patches`, the freshness probe and the in-process populate share one database. The performance debrief measured the memo hit at 0.25 µs.

<details><summary>Full review</summary>

Scope: `origin/dev...HEAD` at `1fffa4251fe`. I read the whole diff, then the re-scope delta `4ec188d7a21..HEAD` line by line, along with the call sites around each seam: `ToolBox.get_expanded_tool_source` and `_get_tool_source_from_store`, `CachedToolBox` init and materialise, the populator's `process_tool` and result loop, `tool_confs_token`, and `MinimalGalaxyApplication`.

**Verdict:** the structure holds up. The re-scope added little code, and most of it is in the right layer:
- the memo is in the Galaxy wiring module;
- the engine version and summary are on the database;
- the parameter-model fast path is in the engine.

There is no structural regression, and no file crosses 1000 lines because of the re-scope. The one existing-file growth worth watching, `tools/__init__.py`, gained only about 15 lines over the whole branch. I found three cheap boundary and canonical-layer fixes and one design smell that has no clearly better replacement.

## Findings acted on

1. **The store-skip conditional was bolted onto the main flow** (`tools/__init__.py`, `get_expanded_tool_source`).
   - The re-scope turned the store lookup into `self._get_tool_source_from_store(...) if self.app.tool_patches is None else None`, a feature check inline in the generic load path.
   - `_get_tool_source_from_store` already owns the "should the store be consulted at all" policy through its early-return guards (`use_cached_toolbox`, `store is None`).
   - Fix: move the guard there as one more early return, and restore the caller to `dev`. Behaviour is identical:
     - `get_expanded_tool_source` is the only production caller (grep);
     - the `_tools_loaded_from_store` counter path is unchanged;
     - `test_tool_source_store_selection.py`'s `SimpleNamespace` app stub gains `tool_patches=None`, the same attribute `MinimalManagerApp` declares.
2. **The memo's types hid a fixed shape** (`tools/patches.py`).
   - It was declared as `WeakKeyDictionary[Any, dict[tuple[Any, ...], ToolPatchDatabase]]`, with `settings[2]` indexing.
   - Fix: a `_Settings = tuple[tuple[str, ...], ReproducibilityLevel, bool]` alias, keys typed as `GalaxyAppConfiguration` (the function's own parameter type), and named locals instead of tuple indexing. The `Any` import is gone.
   - The docstring is down to the what plus one constraint.
   - I kept the nested per-settings dict: `test_freshness_token_follows_collections_and_policy` mutates `tool_patch_reproducibility` on the same config and relies on getting a new database.
3. **The parameter-model fast path duplicated a reader** (`engine._model_source`).
   - It used `root.find("inputs")`, restating what `XmlPagesSource` reads.
   - Fix: use `XmlPagesSource(root).input_elem`. If the canonical reader changes, the guard then follows it instead of silently drifting.
   - The profile comes from `root.get("profile")`, which is the same attribute `XmlToolSource.parse_profile` reads (`parse_profile_version` → `parse_profile`). Comparing the raw `<inputs>` bytes is stricter than the stripped model, so the shortcut only ever returns False when the full check would too.
4. **Small tidies.**
   - `_policy_bytes` was a two-step f-string. It is now one `"\0".join(map(str, parts))`, with the bytes unchanged, so digests and tokens are unchanged.
   - The `tool_patch_reproducibility` description had one over-long line in `config_schema.yml`, which I rewrapped. `config_manage.py build_rst` and `build_sample_yaml` re-flow it, so the tracked `.rst` and sample didn't change.
   - Rename sweep: `git diff origin/dev...HEAD | grep 'special\|all_inputs'` finds no `special_inputs` or `all_inputs` left anywhere in the diff (`.py`, `.yml`, `.rst`, fixtures, `codes.py` templates). Only unrelated `get_all_inputs` context lines match.

## Findings not acted on

5. **The patch-state counter is logging state on the domain object** (`database.py`: `_state_counts`, `_counts_lock`, `state_counts`, `summary(since=)`, plus `populator.py`'s `patch_counts_at_start`).
   - **The problem:**
     - The database is a memoized, process-shared object whose job is to apply patches. It now also accumulates observability tallies under a second lock.
     - The populator reads a per-run figure from it by snapshot and subtract. That is a non-atomic protocol: concurrent `apply_patches` calls from a toolbox reload in another thread land in the "this populate" delta.
     - `summary(since=)` has one caller.
   - **Option 1, count where the toolbox counts.** `ToolBox` already keeps per-load counters (`_tools_parsed_from_file`, `_tools_loaded_from_store`) and logs them in `_log_tool_loading_summary`, so that looks like the canonical home. But:
     - `CachedTool` has no `patch` attribute, and it is a closed `__slots__` stand-in where unknown attributes raise.
     - Counting from index entries on a cached boot with a fresh index reports recorded states, not parsed ones. That changes what the boot line says.
   - **Option 2, count populate results.** The populator could tally `tool_source.patch_state.states` from its own result loop, since it already holds each `tool_source` for stored and skipped results. But the boot line would still need the database counter.
   - **The cleanest end state** is a pure `summary(states)`, populate counts from its own results, and boot counts from the toolbox. That changes the log semantics, so I'm leaving it for a decision rather than changing it in a hardening pass.
6. **`ENGINE_VERSION` appears in two encodings.**
   - `_policy_bytes` covers the per-tool digest, and `token()` prefixes the version to `collections_summary()` JSON. The prefix exists because the summary model doesn't carry the version.
   - Moving it into `ToolPatchCollectionsSummary` would encode it once, and would let `_log_read_only_tool_patches` spot engine-version differences. But that changes the persisted `ToolIndex.tool_patch_collections` and manifest `tool_patches` shapes and the `INDEX_SCHEMA_HASH` pin. Left as is.
7. **Carried #12: the job-cache rule at three entry points.** Status unchanged. `completed_jobs`, `/api/jobs/search` and the tool-request service are distinct entry points. The service-side decision exists because the Celery worker rebuilds the tool without patch state, and only a task schema change would remove it.
8. **Carried #13: test file size.** `test_tool_patches.py` is 1309 lines, a new file. It could split mechanically along its `# ---` sections. That still needs a decision because it renames the test path used by every verification command.

## Checked, no issue

- **`tool_patch_database_from_config` memo**
  - Is it a `WeakKeyDictionary` on the config? Yes: entries go away with the config. The configs are hashable by identity: `GalaxyAppConfiguration` and the `PopulateConfig` test stub are plain classes with no `__eq__`/`__hash__` override.
  - Does the lock make the first load atomic with respect to the probe and the boot populate? Yes.
  - Is a load failure cached? No, which matches the earlier behaviour.
- **Store-row skip is safe on the cached path.** The skip only matters under `use_cached_toolbox` with a store. There, `CachedToolBox` serves tools through `_create_tool_from_stored_source` with `entry.patch`, and the eager lookup is only the index-miss fallback. Parsing and patching from disk is correct there.
- **`_model_source` shortcut.** The parameter model reads only the root `profile` and the pages' `<inputs>`: `input_models_for_tool_source` → `parse_input_pages` / `parse_profile_version`. So when those are byte-identical, the result equals the old full comparison, including the exception branches.
- **`ToolPatchDatabase.summary`.** It iterates `get_args(PatchStateName)`, so a new state name shows up in the tally automatically.
- **Level rename.** `ReproducibilityLevel`, `PatchPolicy`, `load_tool_patch_database`, the config enum and default, the sample, the rst, the fixtures and the tests all agree. `_UNUSUAL_TAGS` follows the new name. `propose_level` keeps the same ordering logic.
- **Test changes since `4ec188d7a21`.**
  - The real-store-row toolbox test is a direct behaviour check with a non-vacuous control case.
  - The integration raw-source helper replaces reaching into `_app`.
  - The populate restart modelling asserts that the same config keeps its database before a fresh config picks up the change.
  - `test_ops_outside_inputs_skip_the_parameter_model` is a perf guard of the kind the perf process allows.
  - None of these weaken a check.
- **File sizes.** No existing file crosses 1000 lines because of this branch. `database.py` (441), `model.py` (444), `collection.py` (350) and `engine.py` (about 330) are cohesive.

</details>
