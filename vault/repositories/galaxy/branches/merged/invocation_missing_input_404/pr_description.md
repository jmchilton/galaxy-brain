Toward 🎯 #20900 - invoking a workflow with an input ID that doesn't exist now returns a 404 naming the input, instead of a 500, 403 or 400.

`POST /api/workflows/{id}/invocations` with `{"input1": {"src": <src>, "id": <well-formed ID that matches no row>}}`:

| `src` | Before | After |
| --- | --- | --- |
| `hda` | 500 `Internal Server Error` (`AttributeError: 'NoneType' object has no attribute 'dataset'`) | 404 `input1: workflow input '<id>' (hda) not found` |
| `ldda` | 403 `Invalid workflow input '<id>' specified` | 404 `input1: workflow input '<id>' (ldda) not found` |
| `ld` | 403 `Invalid workflow input '<id>' specified` | 404 `input1: workflow input '<id>' (ld) not found` |
| `hdca` | 400 `History dataset collection association not found` | 404 `input1: workflow input '<id>' (hdca) not found` |

Each old response points the client somewhere wrong. The HDA case is a server crash, and the only one that reaches Sentry. For library inputs a missing item is reported as a permission problem. None of them say which input was bad. The new message uses the same `<step label or index>: ...` prefix the resolver already uses for parameter errors. API clients (BioBlend, scripts, WES) are the ones who hit this; the run form only offers items that exist.

***Only requests that already failed change. Valid library inputs still copy into the target history, and a private dataset or another user's collection is still a 403. New API tests pin both, and they pass on the base branch too.***

***It targets `release_26.1` because the `hda` case is an unhandled 500; the other three sources move with it so all four report a missing input the same way.***

***This doesn't do #20900's early validation. The request still fails where it did, after the target history is resolved, so a request using `new_history_name` still leaves an empty history behind. Moving validation ahead of side effects is the larger 🌿 `issue_20900_invocation_validation` branch.***

<details><summary>Implementation</summary>

- `lib/galaxy/workflow/run_request.py`: new `_get_input_or_not_found(trans, model_class, data_request, step)` decodes the ID, does the same `sa_session.get` the branches already did, and raises `ObjectNotFound` when it's absent. The `hda`, `ldda`, `ld` and `hdca` branches of `build_workflow_run_configs` use it in place of their own lookups and bare `assert`s.
- The `hdca` branch passes the found collection's ID to `dataset_collection_manager.get_dataset_collection_instance`, which still does the history accessibility check.
- Existing managers weren't a drop-in fit:
  - `hda_manager.get_accessible` takes roles from a different source and drops the step label.
  - `library_dataset_manager.get(check_accessible=True)` would also 404 deleted library datasets, which resolve today.
  - Changing `get_dataset_collection_instance` to raise `ObjectNotFound` touches its 17 call sites and the report-rendering test that asserts its 400 text (`test_workflows.py:4530`). That could be a separate `dev` change.
- Test helpers:
  - `WorkflowPopulator.invoke_single_input_workflow_raw(history_id, src, input_id)` uploads a step-less workflow with one `data` or `collection` input and invokes it with that input reference, using the existing `invoke_workflow`.
  - `_different_user_history()` (beside `_different_user()` in `galaxy_test/base/api.py`) acts as another user and yields a new history they own. A second commit uses it at the 8 existing sites that did `with self._different_user(): x = new_history()` and kept working as that user.

</details>

## Risks

The one-way part is small: a release-branch API error contract changes for already-failing requests (403→404 for `ldda`/`ld`, 400→404 for `hdca`, 500→404 for `hda`).

<details><summary>Risk Details</summary>

- A client that branches on the old 403 or 400 for these requests would see a 404 instead. No test or caller in Galaxy depends on the old codes or messages for invocation requests; the one test asserting the collection manager's 400 text covers report rendering, which this doesn't touch.
- A 404 now differs from a 403 for every source; HDAs (500 vs 403) and HDCAs (400 vs 403) already differed. Probing it needs a validly encoded ID, and encoding an arbitrary integer is admin-only (`configuration/encode`).

</details>

<details><summary>Risk Review Advice</summary>

Check that every branch still runs its original access `assert` after the not-found guard, so an inaccessible input remains a 403. Check that the `hdca` branch still goes through `get_dataset_collection_instance` for its accessibility check.

</details>

## Context

Toward #20900 ("Add validation step in workflow submission / scheduling"). This is an independent extraction from 🌿 [`issue_20900_invocation_validation`](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), which moves invocation validation ahead of history creation. It has no dependency on that branch or on the other extractions from it. There are no field reports of these errors; the evidence is the API test failing on `release_26.1` with the old codes.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the narrow missing-input scope across all four existing-object sources.</summary>

- Dropping collections would leave the same inconsistency for `hdca`.
- Malformed IDs, deleted objects, input-type mismatches and missing library associations are separate contracts, not nonexistent top-level objects.
- Preflight validation before side effects needs the larger resolver redesign in the parent branch.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the four-source API regression unchanged; no browser test needed.</summary>

- The test hits the public invocation API and checks the status code and the input-specific message for each source.
- It encodes a nonexistent integer ID through the API, so it tests absence, not malformed-ID handling.
- It matches the workflow input type to the source (`collection` for `hdca`) and targets an existing history, so the test doesn't fail for unrelated reasons.
- There's no UI change, so no browser test is warranted.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? API clients get a 404 (`err_code` 404001) naming the step and the input's ID and source. The run form would show it as "Workflow submission failed: …", but it only offers inputs that exist.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. No unit tests; the API tests check public status codes, error codes and messages, and that a valid library input lands in the target history.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Only invocation requests that already failed get a different status code and message.
- [x] Who hits this in practice and what is the evidence? API clients (BioBlend, WES, MCP, scripts) sending an ID that never existed on this server, e.g. after a dev database reset or against the wrong server. There are no field reports; the evidence is the API test failing on the base branch with 500/403/403/400.
- [x] Were simpler or existing approaches considered? Yes. The existing managers change access semantics or messages (see Implementation). Fixing the collection manager at the source touches 17 call sites, which is too broad for a release branch.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

All in `lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi`:

- `test_run_with_nonexistent_input[hda|ldda|ld|hdca]` asserts the 404, `USER_OBJECT_NOT_FOUND` and the full message. All four fail on `release_26.1` (500/403/403/400) and pass here.
- `test_run_with_library_input[ldda|ld]`: a valid library dataset is copied into the target history (`copied_from_ldda_id` matches). This is a control; it passes on the base too. No existing API test invoked a workflow with a library input.
- `test_run_with_inaccessible_input[hda|hdca]`: another user's private dataset or collection is still a 403. This is a control; it passes on the base too.
- The existing `test_run_with_optional_collection_specified` still passes with a valid collection input.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
