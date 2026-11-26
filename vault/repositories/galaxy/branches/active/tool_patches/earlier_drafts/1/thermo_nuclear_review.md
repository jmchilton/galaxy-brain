Run via Claude Opus at high effort.

# Thermo-nuclear code quality review

I acted on findings 1–10 in four behaviour-preserving commits on `tool_patches`, on top of `1b1a6c5deae`. None of them changes the patch file format, config options or the API `patches` field.

- `415c7d4c5e9`: each op model now has `selector` and `fragments` properties. There is one classifier and one applier per op type, dispatched explicitly and ending in `assert_never`. The classification and unit outcomes are typed as `Literal`/`Final` constants. The unused `check_parameter_model` flag is gone, and `PatchUnit.skipped` is a property.
- `e2ee152c425`:
  - `_apply_file` branches once per unit outcome, with no shared `advisory` local to reset.
  - `PatchFile.policy_governs` replaces the mixed-file rule that was spelled three ways.
  - `digest_for` computes the matched files once per collection.
  - `vulnerable` and the state names are typed.
- `8abbd9d5351`: `PatchCollection._walk` is split into `_walk_local`, `_walk_shed_owner` and `_walk_tool`.
- `4ec188d7a21`:
  - `_repository_dir_hint` is deleted, and the parameter is renamed `tool_path`.
  - `indexed_patch_is_current` replaces the inline digest comparison in the populator.
  - The cached toolbox now sets `tool_source.patch_state` before building the tool, so it no longer patches `tool.patch` afterwards.
  - `patches_as_dicts` moves to `galaxy.tool_util.patches`, a coordinator request so `galaxy.tool_util.security` can reuse it.
  - `patch_blocks_job_cache` uses `APPLIED`.

Verification:
- Unit tests: 563 passed and 2 xpassed, the same as the baseline before the changes. The command covered `test_tool_patches.py`, `test_toolbox.py`, `scripts/tool_source`, `test_cached_tool.py` and `source_store`.
- Integration tests: `test/integration/test_tool_patches.py` 12 passed.
- Lint: ruff, black and isort are clean on every branch-changed `.py` file.
- mypy, scoped: only the expected `managers/notification.py` error.

## Not acted on

- **NEEDS-DECISION, #11: the patch database is built up to three times at boot.** Each build walks the collections, and the freshness token hashes every patch file. Fixing it means threading one database through the freshness probe registry (`(config) -> str`), the populator signature and the CLI path. That is an API change across `source_store`, not a local cleanup.
- **NEEDS-DECISION, #13: `test_tool_patches.py` is a new 1266-line file.** It could split mechanically along its `# ---` sections into a `test/unit/tool_util/patches/` package. That changes the test path every debrief and verification command names, so it needs a decision.
- **#12: the job-cache rule is checked at three entry points.** They are distinct entry points with distinct semantics. A `Tool` property removes no call site and grows a 5k-line class. Carrying `patch` on `schema.tasks.ToolSource` would remove the web-process decision, but that is a Celery task schema change (NEEDS-DECISION if wanted).
- **Null-object database in place of `None`.** I kept `None`: with `tool_patch_paths` empty, the freshness tokens, index and manifest stay byte-identical to `dev`.
- **Behaviour I observed and left alone:** a `skipped` (needed_from-gated) compat unit drops a compat file advisory. I preserved it exactly; whether it is intended is a question for the format owner.
- **`_unit_fields` still returns an untyped dict** that is spread into `PatchState`. A typed shared base would reorder `PatchState`'s serialized keys, so I left it.

<details><summary>Full review</summary>

Scope: `git diff origin/dev...HEAD` on `tool_patches` (at `1b1a6c5deae`). The review covers the `lib/galaxy/tool_util/patches/` package and the Galaxy load seams.

**Verdict:** the architecture is right:
- a pure `tool_util.patches` package;
- one load seam per toolbox (eager `get_expanded_tool_source`, populator `process_tool`);
- patch state carried on the index entry.

No file below 1k lines crosses 1k, except the new 1266-line unit test file. The structural debt is local, in four places:
- type dispatch done with `isinstance` chains spread over two modules;
- an untyped state vocabulary;
- one busy state-producing loop in `database._apply_file`;
- a redundant path normalisation layer.

None of it is a presumptive blocker, and all of it can be fixed without changing behaviour.

## 1. Op bodies don't own their shape (missed simplification)

- `model.op_selector`, `model._op_fragments`, `engine.classify` and `engine.apply_op` each switch on the op type with `isinstance`. That is four dispatchers for one closed union.
- `classify` and `apply_op` treat `RemoveElement` as the implicit fall-through: the final unguarded block, and a bare `else:`. A fifth op type would silently be treated as a removal.
- **Fix:**
  - Make `selector` and `fragments` properties of each op model, which deletes `op_selector` and `_op_fragments`.
  - Write one classifier and one applier per op type, and dispatch on type explicitly, so `RemoveElement` is named.

## 2. State vocabulary is stringly typed across three modules (type boundary)

- The state names live in different places:
  - `engine.PRE/POST/NEITHER` and `APPLIED/ALREADY_APPLIED/MISMATCH/SKIPPED` are bare `str` constants.
  - `database.ADVISORY` is a separate `str`.
  - `tools/patches.patch_blocks_job_cache` compares against the literal `"applied"`.
- `UnitResult.state: str` and `classify() -> str` hide the closed set that `model.PatchStateName` already declares.
- **Fix:**
  - Type the constants as `PatchStateName`, and the classification as its own `Literal`.
  - Make `UnitResult.state` a `Literal` of the three unit outcomes.
  - Use `APPLIED` in `patch_blocks_job_cache`.

## 3. `database._apply_file` is the busiest function in the branch (spaghetti)

- A mutable `advisory` local is assigned, conditionally reset to `None` in two branches, and appended after the `if` chain. A reader has to simulate the loop to learn when the file advisory is attached, dropped or emitted on its own.
- The `state()` closure spreads an untyped `dict[str, Any]` from `_unit_fields` into `PatchState`.
- `_generated` types `vulnerable` as `Any`.
- **Fix:** one branch per unit outcome (`already_applied`, applied, then demoted-or-mismatched), which makes it explicit where the file advisory goes:
  - attached to `applied`;
  - dropped for `already_applied` and `skipped`;
  - trailing after demoted or mismatched units.

  Also type `vulnerable` as `Vulnerable | None`.
- Observed behaviour, kept as-is: a `skipped` (needed_from-gated) compat unit drops a compat file advisory. The post-loop check sees the kind among the units and doesn't emit it either.

## 4. One concept, three spellings: "the file-level policy fields describe ops of this kind" (repeated conditional)

These three places all encode the same rule:
- `PatchFile.policy_ops`: `self.kind == "mixed"` → security ops only;
- `database._unit_fields`: `patch.kind == "mixed" and kind == COMPAT` → `identical`;
- `database._demotion`: `patch.kind == "mixed" and unit.kind != SECURITY` → `None`.

**Fix:** a single `PatchFile.policy_governs(kind)` predicate in the model, used by all three.

## 5. `collection._walk` nests four loops deep with a `continue`-guarded local branch (legibility)

- The shed path and the `_local` path repeat the "tool directory → version files or override dirs" step. They differ only in whether override directories are allowed.
- **Fix:** extract `_walk_tool(prefix, tool)`, keyed on `is_shed_key(prefix)`.

## 6. `ToolPatchDatabase.digest_for` re-derives the matched files (duplication)

- It calls `c.version_file(key)` twice per collection and hand-rolls the same "override then version file" pair that `_apply_collection` uses.
- **Fix:** compute the pair once per collection.

## 7. `tools/patches._repository_dir_hint` is a redundant normalisation layer (thin wrapper)

- `ToolPatchDatabase._checked_out_changeset` already accepts a file or a directory. `find_repository_dir` already makes the path absolute.
- `test_tool_digest_matches_applied_digest` already passes a tool file path as `repository_dir_hint`, so the parameter name doesn't match what it receives.
- **Fix:**
  - Delete `_repository_dir_hint`.
  - Rename the parameter to `tool_path`. The child branch only calls `apply_patches(tool_source, guid=...)`.

## 8. Two carriers of patch state on the cached toolbox (boundary)

- The eager path: `Tool.parse` reads `tool_source.patch_state`.
- The cached path: it builds the tool, then overwrites `tool.patch` after construction.
- So `Tool.patch` is set in two places, and in the cached path it is briefly `None` during `Tool.parse`.
- **Fix:** set `tool_source.patch_state = entry.patch` on the fresh source before `create_tool_from_source`, so `Tool.parse` is the only writer.

## 9. Dead flags

- `evaluate_unit(check_parameter_model=True)`: no caller passes the flag.
- `PatchUnit.skipped` is derivable as `not ops`.
- **Fix:**
  - Delete the parameter.
  - Make `skipped` a property.

## 10. Populator fast path inlines patch-state knowledge (layer)

- `process_tool`'s "unchanged" guard grows `(old_entry.patch.digest if old_entry.patch else None) == indexed_patch_digest(...)`. Patch internals leak into an already busy condition.
- **Fix:** `indexed_patch_is_current(db, entry, path)` in `galaxy.tools.patches`.

## 11. Boot builds the patch database up to three times (orchestration)

- `app.tool_patches` builds it.
- `freshness.tool_confs_token` builds it again, on every freshness probe.
- `populate_store_inline` builds it again.
- Each build walks every collection, and the token hashes every patch file.
- The phase C/D review deferred this "to hardening".
- Threading one database through means changing the freshness probe registry (`(config) -> str`), the populator signature and the CLI path.

## 12. The job-cache rule is checked at three entry points

- The three call sites:
  - `Tool.completed_jobs` (legacy API, workflows, Celery);
  - `FastAPIJobs.search` (`/api/jobs/search`);
  - `JobsService.create` (tool requests, decided in the web process because the worker drops patch state).
- These are distinct entry points with distinct semantics.
- A `Tool` property would remove no call site and would grow a 5k-line class.
- Carrying `patch` on `schema.tasks.ToolSource` would let the Celery path use `Tool.completed_jobs` like the others, but that is a task schema change.

## 13. File size

- `test/unit/tool_util/test_tool_patches.py` is a new 1266-line file. It has clean `# ---` sections (model, engine, keys, dirstate, collections/database), so it could split into a `test/unit/tool_util/patches/` package.
- Every other file over 1k lines (`tools/__init__.py`, `toolbox/base.py`, `cached_toolbox.py`, `populator.py`) was over 1k before the branch. The branch adds under 40 lines to each.

## Looked at, fine

- The `_Input.text` callable: `XmlToolSource.to_string()` is the raw expanded text, not `xml_to_string(tree)`, and coverage hashes depend on it.
- `parse_patch_yaml` looks like an identity wrapper, but it is the seam `test_concurrent_apply_parses_each_file_once` patches.
- The `None` database for "feature off" keeps freshness tokens, index and manifest byte-identical to `dev` when `tool_patch_paths` is empty. A null-object database would change them.
- `key_from_ids(entry.id, entry.id, entry.version)` is correct: the index id is the guid for shed tools.

</details>
