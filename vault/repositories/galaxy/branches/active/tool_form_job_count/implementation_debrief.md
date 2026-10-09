# tool_form_job_count — implementation debrief

Branch `tool_form_job_count` on `jmchilton` fork, 4 commits on origin/dev `4fe00d9e7ab`, head `5d2684ace76`. Split out of `issue_20657_input_processing_mode` (originally phases 3–4 there, `814930b103f`..`9294237826c`), cherry-picked cleanly; independent of that branch (only `lib/galaxy_test/api/test_tools.py` overlaps, different tests; `git merge-tree` of the two is clean; no imports of its client code), so either PR can land first. Full plan, research notes and original debrief: [issue_20657 plan](../issue_20657_input_processing_mode/plan.md), [issue_20657 debrief](../issue_20657_input_processing_mode/implementation_debrief.md).

## What landed

| Commit | What |
|---|---|
| `98eb40643a6` + `43a9be32648` | `job_expansion` in `/api/tools/{id}/build` response: `summarize_meta_expansion` in `meta.py` (never raises; `{job_count, reason, inputs}`), counts without loading HDAs (`DatasetCollection.element_count_at_depth` single COUNT query; `subcollections.split_count`). Shared `_meta_value_classifier` / `_split_meta_inputs` / `_batch_collection` across sync, async and count paths; `permutations.matched_length` / `count_combos`. Gated on a batched input. Count path checks `security_agent.can_access_collection`. Unknown ids → `ObjectNotFound` (execution path 4xx instead of 500). Removed unreachable plain-string batch branches (`__collection_multirun_parameter` only accepts dicts with `src` hdca/dce). |
| `adb338fb778` + `5d2684ace76` | "This will run N jobs." above footer Run (`ToolFormJobCount.vue`, `jobCount.ts`), breakdown for multiple batch inputs, warnings for empty collection / mismatch / remap > 1 job; Run tooltip " - N jobs"; stale build-response guard in ToolForm. |

## Verification (after split)

- `test/unit/app/tools/test_meta_expansion.py` + `test_misc.py -k element_count`: 22 pass.
- vitest `src/components/Tool/`: 20 files, 98 pass (node 22.20.0).
- API test `TestToolsApi::test_build_job_expansion` and live browser checks were run before the split on the combined branch (see original debrief); not rerun here.
- Fork CI: not run.

## Not acted on

See "Review suggestions not acted on" in the original debrief (match_collections walk with ≥2 linked nested collections; remap `map_over_type` carry; composed `localize()` fragments; unreachable `×` breakdown).

## Open questions

- PR text should call out the `meta.py` execution-path refactor and the 404-instead-of-500 change.
- Run button stays enabled on empty / mismatch warnings — disable?
