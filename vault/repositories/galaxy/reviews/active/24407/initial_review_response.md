(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: 2273ae0bca5

The only one-way-ish risk is a behavior change on a release branch: a discovered output collection from an errored job that found no elements now ends `populated_state: failed` instead of populated-and-empty, which changes the downstream outcome for workflows (failed invocation instead of a "successful" empty map-over). Otherwise it's a small two-way door that's easy to revert.

<details><summary>Risk Details</summary>

- Workflows that used to "complete" after a producer step errored with no outputs (the mapped steps ran zero jobs) now fail with `collection_failed`. Users or automation relying on the old completion, for example with error-tolerant steps or reruns, will see different invocation states after a 26.1 point release.
- The check only fires when `final_job_state == "error"` and the collection is empty. If an errored job discovered even one element, the collection stays populated with no warning, so the fix covers only part of the problem and that remaining behavior is now effectively locked in.
- Collections that are legitimately allowed to be empty but come from an errored job (for example, a tool that errors but has outputs meant to be inspected) now become failed collections. That affects history display and anything that consumes failed collections, including the job/collection rerun and remap paths.
- The extended-metadata path depends on `job_context.add_dataset_collection` running after the new call so that the failed state gets serialized. It does run (it is the unconditional call after the try block), but the only test is a plain API workflow test, so nothing exercises extended metadata or Pulsar.
- The PR adds a new test tool (`collection_creates_dynamic_list_failbool`) to `sample_tool_conf.xml`. This is test-only and reversible.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the new semantics belong in a 26.1 point release: "an errored job with an empty discovered collection fails the collection, and therefore the invocation". The precedent is the existing `MaxDiscoveredFilesExceededError`/security branches, which already mark collections failed. Check that the empty-only condition is the intended scope rather than failing on any errored job.

Also confirm that failed collections from errored jobs still behave sensibly for job rerun/remap (`remap` of dependent paused jobs) and in the history UI, and consider whether an extended-metadata test configuration should cover the serialization of the new state.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24407_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24407_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24407_review_0) is built on the PR's reviewed commit `2273ae0bca5`. Its main addition is a deterministic tools-API test for the map-over case: the test tool `collection_creates_dynamic_list_failbool` gains an optional input, so it can be mapped over a list where only the `fail`-named element errors empty. The branch also trims the comments to one line, uses `Job.states.ERROR`, rewords the population-failed message, adds the tool's own failing-path test, and tightens the PR's API workflow test assertions.

- [`ee731b45274`](https://github.com/jmchilton/galaxy/commit/ee731b45274) Test map-over of discovered list where one element fails empty: adds the optional `input1` to the test tool, plus `test_map_over_dynamic_list_output_element_failed_empty` in `test_tools.py`; the test fails without the PR's `output_collect.py` change.
- [`08895714309`](https://github.com/jmchilton/galaxy/commit/08895714309) Trim comments to one line: cuts the `output_collect.py` comment to one line and drops the test's rationale comment.
- [`705eaffd52a`](https://github.com/jmchilton/galaxy/commit/705eaffd52a) Compare final job state to Job.states.ERROR: moves `Job` from the `TYPE_CHECKING` import to the runtime `galaxy.model` import and replaces the `"error"` literal.
- [`1013de00d93`](https://github.com/jmchilton/galaxy/commit/1013de00d93) Reword population-failed message to what is known: the message is now "Job failed and no datasets were discovered for this collection."
- [`7f1861eec31`](https://github.com/jmchilton/galaxy/commit/7f1861eec31) Cover failing path in collection_creates_dynamic_list_failbool tool tests: adds an `expect_failure` tool test with `failbool=true`.
- [`e8463cbbbb6`](https://github.com/jmchilton/galaxy/commit/e8463cbbbb6) Strengthen discovered-collection failure test assertions: asserts a single `collection_failed` message whose `hdca_id` is the producer's HDCA, the population-failed message, and no jobs in either downstream step.

</details>

</details>

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

Fixed in [`ee731b45274`](https://github.com/jmchilton/galaxy/commit/ee731b45274).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: Comments justify the design instead of stating the what (implementation verified)

The new comment in `output_collect.py` and the opening comment in the test each spend 2–3 lines on rationale (consumers mapping over zero elements, the invocation completing with no data). That rationale is already in the commit message and PR body.

Cut the code comment to one line (`# errored job with no discovered elements is a failed population, not an empty one`) and drop the test comment, since the test name already carries the intent. The review branch does this.

Fixed in [`08895714309`](https://github.com/jmchilton/galaxy/commit/08895714309).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Compare against `Job.states.ERROR` instead of the `"error"` literal (implementation verified)

The sibling check in `model/store/discover.py` uses `galaxy.model.Job.states.ERROR`, and `output_collect.py` already imports from `galaxy.model` at runtime, where `Job` had only been a `TYPE_CHECKING` import.

Move `Job` into the runtime `galaxy.model` import and compare with `Job.states.ERROR`. The review branch does this.

Fixed in [`705eaffd52a`](https://github.com/jmchilton/galaxy/commit/705eaffd52a).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Population-failed message overstates what is known (implementation verified)

"Job failed before producing any datasets for this collection." isn't always accurate: the job may have written files that didn't match the `discover_datasets` pattern. Users see this text via `populated_state_message`.

Use "Job failed and no datasets were discovered for this collection." The review branch does this, and the PR's test now asserts the message.

Fixed in [`1013de00d93`](https://github.com/jmchilton/galaxy/commit/1013de00d93).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: New tool's `<tests>` skip the failing path (implementation verified)

`collection_creates_dynamic_list_failbool.xml` tests only `failbool=false`, so the tool framework tests never exercise the path the tool exists for.

Add `<test expect_exit_code="1" expect_failure="true">` with `failbool=true`, mirroring `collection_creates_dynamic_nested_fail.xml`. The review branch does this.

Fixed in [`7f1861eec31`](https://github.com/jmchilton/galaxy/commit/7f1861eec31).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: Strengthen the API test's assertions (implementation verified)

`invocation["messages"][0]["reason"]` is positional, so an extra or different message wouldn't surface. The test also checks only that the reducer ran no jobs, not the mapped `per_element` step.

Assert exactly one message, that it is `collection_failed` with `hdca_id` equal to the producer's HDCA, the `populated_state_message`, and that both `steps[1]` and `steps[2]` ran no jobs. The review branch does this.

Fixed in [`e8463cbbbb6`](https://github.com/jmchilton/galaxy/commit/e8463cbbbb6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
