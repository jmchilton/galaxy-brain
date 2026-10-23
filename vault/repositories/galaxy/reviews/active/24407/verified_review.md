### P2 1: Map-over case fails the whole invocation and is untested (implementation verified)

When a tool with a discovered `list` output is mapped over a list and one element's job errors without discovering anything, that element's sub-collection is now marked `failed`. As a result, the implicit `list:list` is no longer `populated`, and the first downstream step fails the entire invocation with `collection_failed`. The healthy elements' downstream work is lost too. Before this PR the failed element was silently dropped and the rest carried on. Non-dynamic mapped outputs behave differently again: one errored element only pauses its own downstream jobs, which can then be rerun and remapped. This matches the PR's intent that silent data loss is the bug, and it matches how `MaxDiscoveredFilesExceededError` in a mapped job already behaves. But it is a user-visible change on a release branch, and neither the PR description nor its test covers it.

<details><summary>Details</summary>

- SQLite and Postgres agree. On SQLite, `populated_optimized` falls back to `_build_nested_collection_attributes_stmt`, which outer-joins each child collection's `populated_state` when `collection_attributes` is passed. So an empty FAILED sub-collection is seen there too. On Postgres the intermediate-collection query covers it.
- The failure can arrive late. When the empty failed element is the last job to finish, nothing touches `history_audit`: the bare sub-collection `DatasetCollection` isn't an HDA or HDCA row. The scheduler then waits for its backfill (`GALAXY_SCHEDULER_BACKFILL_SECONDS`, 300s) before it notices. The same latency existed before the PR, which simply ended in success instead. So the invocation-level outcome isn't pinned in a test, because a 60s wait is order-dependent.

</details>

<details><summary>Evidence</summary>

A workflow test was run locally on SQLite. It mapped `collection_creates_dynamic_list_failbool` (`failbool: true`) over a list `[ok_a, fail_b]` and fed the result to `cat1`. Over 5 runs:

- When the error job finished first (2 runs), the invocation ended `failed`, with exactly one `collection_failed` message whose `hdca_id` was the implicit `list:list`. The parent showed `populated: false`, `ok_a` was populated with 2 elements, `fail_b` was unpopulated and empty, and `cat1` ran no jobs.
- When the error job finished last (3 runs), the invocation stayed `ready` past the 60s wait, with "dependent collection not yet populated" and no further scheduling.

The tools-API test on the review branch (below) passes on this PR and fails without the `output_collect.py` change (`assert not collection["populated"]`).

</details>

Pin the map-over behavior with a test, and say in the PR description that one empty failed element now fails downstream for the whole mapped collection. Whether that is preferable to silently dropping the element is the author's call. If it isn't wanted, limit the check to top-level collections (`has_collection` being an HDCA). The review branch adds a tools-API batch test, which is deterministic because it doesn't involve the workflow scheduler. It asserts the implicit `list:list` is not populated, `ok_a` is populated with 2 elements, and `fail_b` is unpopulated and empty. To support the test, the test tool gains an optional `input1` and fails only when the input's identifier contains `fail`. The PR's existing test is unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Comments justify the design instead of stating the what (implementation verified)

The new comment in `output_collect.py` and the opening comment in the test each spend 2–3 lines on rationale (consumers mapping over zero elements, the invocation completing with no data). That rationale is already in the commit message and PR body.

Cut the code comment to one line (`# errored job with no discovered elements is a failed population, not an empty one`) and drop the test comment, since the test name already carries the intent. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Compare against `Job.states.ERROR` instead of the `"error"` literal (implementation verified)

The sibling check in `model/store/discover.py` uses `galaxy.model.Job.states.ERROR`, and `output_collect.py` already imports from `galaxy.model` at runtime, where `Job` had only been a `TYPE_CHECKING` import.

Move `Job` into the runtime `galaxy.model` import and compare with `Job.states.ERROR`. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Population-failed message overstates what is known (implementation verified)

"Job failed before producing any datasets for this collection." isn't always accurate: the job may have written files that didn't match the `discover_datasets` pattern. Users see this text via `populated_state_message`.

Use "Job failed and no datasets were discovered for this collection." The review branch does this, and the PR's test now asserts the message.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: New tool's `<tests>` skip the failing path (implementation verified)

`collection_creates_dynamic_list_failbool.xml` tests only `failbool=false`, so the tool framework tests never exercise the path the tool exists for.

Add `<test expect_exit_code="1" expect_failure="true">` with `failbool=true`, mirroring `collection_creates_dynamic_nested_fail.xml`. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: Strengthen the API test's assertions (implementation verified)

`invocation["messages"][0]["reason"]` is positional, so an extra or different message wouldn't surface. The test also checks only that the reducer ran no jobs, not the mapped `per_element` step.

Assert exactly one message, that it is `collection_failed` with `hdca_id` equal to the producer's HDCA, the `populated_state_message`, and that both `steps[1]` and `steps[2]` ran no jobs. The review branch does this.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
