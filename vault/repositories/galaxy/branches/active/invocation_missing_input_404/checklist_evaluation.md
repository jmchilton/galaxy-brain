# Checklist evaluation

Fresh subagent, 2026-10-15, against `671f49b38cb` on `release_26.1`; GENERAL + WORKFLOW_RELATED. All items pass or need judgement; none fail. One optional quality fix applied afterward (below).

| Item | Verdict | Top line |
| --- | --- | --- |
| Human read every test/comment | — | Left for John. |
| What does the user see when it fails? | PASS | 404 `err_code` 404001, `"input1: workflow input '<id>' (hda) not found"`; was bare 500 (hda), 403002 (ldda/ld), 400008 (hdca). Run form surfaces it as "Workflow submission failed: …" (`WorkflowRun.vue:254`). |
| Diff free of unrelated changes | PASS | Yes! |
| Unit tests not literal implementation | PASS | No unit tests; one parametrized API test asserts public status + message. Uses `configuration/encode/999999999` for a well-formed nonexistent ID (a random key would 400 as malformed). |
| Comments free of archeology | PASS | No comments added. |
| Comments describing previous impl | PASS | N/A. |
| Which existing workflows change behavior | PASS | None; only already-failing requests change status/message. 403→404 (ldda/ld) and 400→404 (hdca) on a release branch. |
| Who hits this, evidence | NEEDS-JUDGEMENT | No field reports. Evidence = local red run (500/403/403/400). Inference: API/BioBlend/WES/MCP clients with IDs that never existed on the server (reset dev DB, wrong server). Deleted/purged items still have rows, so aren't affected. Only the HDA 500 reached Sentry. |
| Simpler/existing approaches | NEEDS-JUDGEMENT → resolved | Managers don't drop in: `hda_manager.get_accessible` changes role source + messages; `library_dataset_manager.get(check_accessible=True)` 404s deleted/inaccessible LDs (semantic change); `managers.base.get_object` raises generic 400. Fixing `__get_history_collection_instance` (`collections.py:910`) at the source touches ~20 callers — dev follow-up, not release. |

## Fix applied

The guard was copied 4x and HDCA was looked up twice (decoded `sa_session.get`, then the manager by encoded ID). Replaced with module-level `_get_input_or_not_found(trans, model_class, data_request, step)`; HDCA now passes `hdca.id` to `get_dataset_collection_instance` (accepts ints, `collections.py:907`). Behavior unchanged; diff 38+/10−. Re-verified: black, isort, ruff clean; no mypy errors in `run_request.py` (run from `lib/`); 6 API cases pass on `release_26.1`. Commit `07094b33253`.

## Gaps noted

- No existing API test invokes a workflow with a valid `ldda` or `ld` input (grep of `lib/galaxy_test`, `test/`), so the refactored success paths for library inputs had no positive coverage. Closed in strengthening by `test_run_with_library_input[ldda|ld]`.
- Possible dev follow-up: `__get_history_collection_instance` raising `ObjectNotFound` would make the HDCA pre-check unnecessary.

## Re-check after strengthening (`fa98868d95c` → `ed2a517eacd`)

Fresh subagent re-evaluated the items the new tests touched (diff hygiene, tests vs implementation, archeology, existing approaches): all PASS, proposed answers accurate. It confirmed `_different_user()` switches every populator used inside it, the controls test real behavior, and `invocation["inputs"]["0"]` is the file's existing idiom. Applied its fixes: `@requires_admin` on `test_run_with_nonexistent_input` (admin-only `configuration/encode`), and a `_upload_single_input_workflow(src)` helper replacing three copies of the one-input YAML workflow. 9 API cases pass.
