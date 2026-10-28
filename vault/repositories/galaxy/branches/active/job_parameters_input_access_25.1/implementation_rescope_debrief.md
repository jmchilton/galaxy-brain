# Re-scope debrief

First scope evaluation ([earlier_drafts/1/scope_evaluation.md](earlier_drafts/1/scope_evaluation.md)) recommended scope B: apply the same contract to tool-form data options returned by `/api/jobs/{id}/build_for_rerun`, behind the same `get_accessible_job` gate, via one shared predicate. Original scope kept as alt `job_parameters_input_access_25.1_alt_original_scope` (`fba59af067f`, [alts/original_scope.md](alts/original_scope.md)).

Branch now (head `d3f0af8ae2e`, base `release_25.1`):

1. `26877f7b1f0` Baseline tests: owner parameters_display shapes (hda/hdca/dce) + owner rerun-form options for inputs outside the current history (hda `(unavailable) <name>`, leaf dce, collection dce).
2. `32dfce5bcf6` parameters_display: inaccessible inputs → `{src, id}`; schema `name` optional; markdown "(not accessible)".
3. `43343df0905` `GalaxyRBACAgent.can_access_data_input` (HDA / HDCA / DCE via `child_collection or collection`); `summarize_job_parameters` uses it.
4. `ea927586c27` Tool-form options: leftover previous inputs (`hda_list` remainder, `append_dce`, collection-param DCE) the caller can't access get name "(not accessible)", `hid: -1`, no tags; ids kept. In-history matching untouched; LDDA untouched (library rule differs).
5. `d3f0af8ae2e` Tool input access error no longer names the dataset (found in re-scope review).

Third-party rerun-form tests use a browser session: API-key requests have no current history, so `Tool.to_json` falls back to `get_owned(job.history)` and only the owner gets through.

Tests: `test_jobs.py` full file 75 passed; `test_tools.py -k "build or rerun"` 2 passed; `test/unit/app/tools/` + markdown export 373 passed; pinned lint + mypy clean. All new behavior tests red before their commit.

Review: [subagents/rescope_review.md](subagents/rescope_review.md).
