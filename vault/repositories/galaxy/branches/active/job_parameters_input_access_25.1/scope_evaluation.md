# Scope evaluation

**Recommendation: modest expansion.** Apply the same id-only contract to the tool form's data options, which `/api/jobs/{id}/build_for_rerun` returns behind the same `get_accessible_job` gate. Route both call sites through one shared predicate on the RBAC agent. Today that predicate exists only as a closure inside `summarize_job_parameters`. Provenance and the dev-side manager cleanup stay out. Contraction isn't viable. Evaluated at head `fba59af067f`.

## Possible Decompositions

The branch has about 180 non-generated lines (128 of them tests).

1. **Baseline tests** (`2ba71466913`). These pin the owner-visible hda/hdca/dce shapes and land first.
2. **Markdown `job_parameters` robustness.** `_data_input_text` stops raising `KeyError` on DCE inputs (they have no hid) and renders `None` as "No input provided". This is a standalone bug fix on 25.1 and can land independently.
3. **parameters_display contract.** The `summarize_job_parameters` change, the `Optional` `name`, the regenerated `schema.ts` and the 5 API tests. It needs (2), or inaccessible inputs render wrong in markdown.
4. **(If expanded) shared predicate + tool-form options.** The RBAC-agent helper, `summarize_job_parameters` re-routed through it, the `DataToolParameter` / `DataCollectionToolParameter` `to_dict` change, and a `build_for_rerun` API test. Stacks on (3).

## Scopes considered

### A. As implemented

`parameters_display` (both endpoints plus the markdown directive) describes hda/hdca/dce inputs the caller can't access by `{src, id}` only, with an admin bypass and no owner bypass. The predicate is a closure in `summarize_job_parameters`.

| Pros | Cons |
|---|---|
| Small, well-tested backport: 6 files, red/green verified | The rerun form for the same job still returns `hid`/`name`/`tags` for the same inputs, so the contract is half-applied across two views of one job |
| Reuses `can_access_dataset` / `can_access_collection` | The DCE rule is duplicated with `DatasetCollectionsService.dce_content`; the predicate is closure-local and can't be reused |
| Markdown DCE `KeyError` fixed along the way | |

### B. Expand: tool-form options + shared predicate (recommended)

Add an RBAC-agent method, for example `can_access_data_input(roles, item)` for HDA / HDCA / DCE (LDDA if needed). It encodes the "DCE → `child_collection or collection`" rule. `summarize_job_parameters` uses it. So do `DataToolParameter.to_dict` (the `hda_list` fallback for values not in the current history, `append_dce`, `append_ldda`) and the DCE option in `DataCollectionToolParameter.to_dict`. An inaccessible option keeps `id`/`src` but gets a placeholder `name` (for example "(not accessible)"), `hid: -1` and empty `tags`. Optionally, `dce_content` also switches to the helper. Test with a third-party `build_for_rerun` API test that reuses `_run_for_parameters_display`.

| Pros | Cons |
|---|---|
| One contract covers every view of a job's inputs: the job info page and the rerun form | Touches `tools/parameters/basic.py`, which is a hotter file on a release branch |
| Fixing in `to_dict` also covers tool build calls that post input state, not just rerun | The client labels options `${hid}: ${name}` (FormData.vue:233/437). A placeholder name is required, and dropping keys would break the labels |
| Builds the reusable abstraction the reviews deferred to dev, and removes the duplicated DCE rule | Adds a design choice: placeholder wording and `hid: -1`, plus whether tags are dropped |
| Small additional code: one helper, ~3 call sites, 1-2 API tests | Owners whose foreign input was later restricted see a placeholder option on rerun (consistent with A's no-owner-bypass choice) |

<details><summary>Details</summary>

- Gate: `build_for_rerun` → `__get_job` → `JobManager.get_accessible_job`. That function allows the owner, an admin, or anyone with access to all of the job's outputs. It is the same gate as `parameters_display`.
- `Tool.to_json(job=...)` runs `_map_source_to_history`. Inputs that don't map into the caller's current history remain in `other_values`. `DataToolParameter.to_dict` then appends them as `"(<state>) <name>"` options with `hid` and `tags`. `DataToolParameter.from_json` and `check_param` do no role checks, so this path is the only filter point.
- `lib/galaxy/model/security.py` has `can_access_dataset`, `can_access_datasets` and `can_access_collection`, but no item-polymorphic helper. The tool params code already reaches `trans.app.security_agent`, so putting the helper on the agent avoids importing managers into `tools/parameters`.
- The admin bypass stays at the call sites (`trans.user_is_admin`), or the helper takes it as a flag, matching `DatasetManager.is_accessible`.

</details>

### C. Expand further: provenance endpoints

Out of scope: different code path (`api/provenance.py`) and payload. Separate follow-up for John to decide.

### D. Dev-only manager-level access helper

A manager-level `is_accessible` for HDCA/DCE (`HDCAManager` has none), shared by the collection service, the job manager and other places.

| Pros | Cons |
|---|---|
| The right long-term home; `HDCAManager` gains parity with `DatasetManager.is_accessible` | Refactors unrelated managers; that belongs on dev, not 25.1 |
| | B's agent-level helper already covers what 25.1 needs; D can wrap it on dev later |

### E. Contract: drop the markdown change, or the DCE handling

| Pros | Cons |
|---|---|
| Slightly smaller diff | Not viable. `name` becoming `Optional` forces the `_data_input_text` change; without it, inaccessible inputs crash or render as `None` in markdown. Dropping DCE leaves a known gap that the codex review already caught |

## Follow-ups

- Provenance (scope C): separate follow-up, John to decide.
- On dev: a manager-level HDCA/DCE `is_accessible` (scope D) wrapping the B helper.
- If B is taken: decide the placeholder wording (shared with markdown's "(not accessible)") and whether `tags` are dropped.
