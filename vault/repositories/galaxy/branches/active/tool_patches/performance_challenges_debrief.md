Run via Claude Opus at high effort.

# Performance challenges debrief

**Verdict:** I made one fix, `7baa6c55d67`. A matched tool went over the 2 ms budget on large tools because the parameter-model guard rebuilt the model twice for every applied unit, even when the ops never touched `<inputs>`. Every other surface I measured is within budget, and I changed nothing else.

Measurements come from scratch scripts run with the worktree `.venv/bin/python` on macOS (APFS). The synthetic collections have 300 or 3000 shed keys, one patch file per key, plus a coverage file each. All numbers are wall-clock times.

## Fixed

**The parameter-model guard ran on every applied unit** (`engine.parameter_model_changed`).
- `_parameter_model` deep-copies the tree and builds `input_models_for_tool_source`, once for the pre-image and once for the post-image. That costs about 22 µs per param.
- The model reads only the root `profile` and the first `<inputs>` (`XmlPagesSource`, `input_models_for_tool_source`).
- The fix compares those two things before building anything. When they are byte-identical the model can't differ, so the function returns False. Its result is the same as before:
  - With identical inputs, an exception on the pre-image would also happen on the post-image, and the old code returned False in that case too.
  - Otherwise the two models are equal, so it returned False.

| Applied `replace_text` on `command` (warm) | before | after |
|---|---|---|
| 20 params | 0.61 ms | 0.08 ms |
| 100 params | 2.40 ms | 0.21 ms |
| 400 params (42 KB) | 9.88 ms | 0.73 ms |

- Ops under `<inputs>`, such as adding a validator, still pay the full guard: about 9 ms at 400 params. That cost is inherent to the guard, and it is paid once per matched tool per process (eager) or per populate (store).
- Test: `test_ops_outside_inputs_skip_the_parameter_model` was red first (2 model builds), then green. It also asserts that an op under `<inputs>` still builds both models.
- Validation:
  - Unit suites: 567 passed, 2 xpassed.
  - `test/integration/test_tool_patches.py`: 12 passed.
  - ruff, black and isort are clean.
  - mypy is unchanged from before (one existing error in the test file at `patch_state.states`).

## Measured, no change

| Surface | Cost | Budget / note |
|---|---|---|
| `apply_patches` miss (local id or shed guid) | 0.55 µs | one dict miss. The parse it follows costs 162 µs, so the miss is 0.3% of it |
| `apply_tool_patches` with no database | 0.05 µs | |
| Cold first hit (YAML parse, validation, coverage read), small tool | 0.62 ms median, 1.75 ms max | < 2 ms |
| `patch_blocks_job_cache` (hit / None) | 0.28 / 0.03 µs | `/api/jobs/search`, tool-request service, `completed_jobs`. It is evaluated last in the `and` chain, so nothing is added per job |
| `patches_as_dicts` (hit / miss) | 1.1 / 0.02 µs | `to_panel_entry` for each tool in `/api/tools` |
| `indexed_patch_is_current` (local miss / shed miss / hit / shed key digest) | 0.5 / 1.0 / 1.4 / 1.8 µs | populator fast path. 10k tools ≤ 18 ms |
| The same, shed key with a per-changeset override | 14 µs | the dirstate is cached by stat signature |
| `tool_patch_database_from_config` memo hit | 0.25 µs | |
| `token()` with the digest cached / `summary()` | 2.2 / 1.9 µs | called on each freshness watcher poll |

**Boot cost** (per process: each web worker, handler and Celery worker):

| Keys | walk (`PatchCollection`) | first digest (reads and hashes every patch and coverage file) |
|---|---|---|
| 300 | ~80 ms | ~135 ms |
| 3000 | ~720 ms | ~1.3–1.8 s |

- This is at the filesystem floor. A raw `os.walk` plus read plus sha256 of the same 6002 files took 1.7–2.3 s on its own. The profile is dominated by `scandir` (12k calls) and `open` (6k calls), and Python-level overhead is about 15%. Nothing worth optimizing.
- `summary()` at boot forces the digest even in eager-only deployments. `token()` needs it anyway whenever a store is configured.
- Realistic sizes are far smaller. The builtin collection is empty.
- The impact of a cold CVMFS or NFS cache is unmeasured and speculative. Each file is opened once per process.

**Config identity.** The probe factory (`source_store/factory.py:41,53`), `app.tool_patches` and the in-process populate (`cached_toolbox.py:999`) all receive `app.config`. The memo therefore hits, and each process loads and hashes the collections once.

**Eager toolbox skipping store rows when patches are configured** (`tools/__init__.py:841-847`). This costs about 0 in steady state:
- `_get_tool_source_from_store` returns None unless `use_cached_toolbox` is set (`:880`).
- Under `CachedToolBox`, `ToolBox.create_tool` → `get_expanded_tool_source` runs only on the warn-level fallback for an index miss after `_populate_adhoc_path` (`cached_toolbox.py:1316-1323`).
- When it does run, the per-tool delta is a file parse (about 160–700 µs for tools of the sizes above) instead of a store row load. I didn't measure the store side.

## Recommendations (not acted on, because behaviour must stay identical)

- **`patches` payload on shared list endpoints** (the #23076 pattern).
  - One applied state is 566 B, and a mismatch plus its advisory is 1607 B.
  - 200 matched tools would add about 0.1–0.3 MB to `/api/tools?in_panel` and `/api/tool_panels`. Those responses are already MB-scale on large panels, so this is a few percent.
  - If it matters, a compact panel form (state, kind and level per entry) could go on the list endpoints, with full detail kept on `/api/tools/{id}`. That is a shape change, so it belongs to a decision for John.
- **The guard for ops under `<inputs>`** could compare only the touched params' models. That gets riskier, so it's not worth doing until there are many large, input-touching patches.

## Not data-based

None of this used a production-size database. No surface adds a query: the patch checks are in-memory, and the job-cache rule short-circuits before the existing job search. I didn't run Postgres because there was no SQL to examine.
