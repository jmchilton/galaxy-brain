(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds one `sa_session.flush()` before the best-effort ToolRequest savepoint so unrelated pending scheduler state fails loudly to the scheduler instead of being swallowed as a ToolRequest capture failure; reverting is a one-line removal.

<details><summary>Risk Details</summary>

- Behavior shift: flush errors from pending scheduler state now propagate out of `_capture_workflow_tool_request_state` rather than being logged and returning `None`; previously such errors left a poisoned session anyway, so this mostly changes where the failure surfaces.
- One extra flush per tool step scheduled (cheap; `begin_nested()` already flushed the same state).
- No API, schema, workflow, or tool-format changes.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24405_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24405_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24405_review_0) sits on the reviewed commit `e277999b9f0` and makes two small changes: it collapses the PR's new comment block to one line (fixing the stale "Savepoint scopes the flush" wording above it), and adds a unit test pinning the other half of the fix, that a flush failure inside the ToolRequest savepoint stays best-effort and leaves the outer session committable.

- [`f6af4743ee5`](https://github.com/jmchilton/galaxy/commit/f6af4743ee5) Collapse ToolRequest pre-flush comment — replaces the five-line comment with one line and narrows the existing paragraph to the ToolRequest flush.
- [`00fc12580ba`](https://github.com/jmchilton/galaxy/commit/00fc12580ba) Test savepoint isolates ToolRequest flush failures — a duplicate-PK history reachable only via the ToolRequest fails the savepoint flush; capture returns `(None, None, None)`, warns, and a later commit still persists pending state.

</details>

</details>

### P3 1: Collapse the new comment block (implementation verified)

The new five-line comment stacks under the existing five-line comment and largely repeats the commit message. The existing paragraph also still says "Savepoint scopes the flush", which is now misleading since the savepoint only scopes the ToolSource/ToolRequest flush.

Collapse to one line and keep the rationale in the commit message:

```python
    # Flush pending scheduler state first; begin_nested() would flush it inside the best-effort block.
    trans.sa_session.flush()
```

Fixed in [f6af4743ee5](https://github.com/jmchilton/galaxy/commit/f6af4743ee5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort; implemented on the review branch with `test_modules.py -k capture` passing.

</details>

### P3 2: Cover savepoint isolation of ToolRequest persistence failures (implementation verified)

The fix relies on a split: unrelated pending state fails loudly (now tested), while failures inside `begin_nested()` stay best-effort and leave the session usable. That second half is untested.

Add a sibling test where the flush fails inside the savepoint: a duplicate-PK `History` that reaches the session only through `tool_request.history`. Assert `(None, None, None)` is returned with one warning, and that a later `commit()` still persists a History added before the call.

Added in [00fc12580ba](https://github.com/jmchilton/galaxy/commit/00fc12580ba).

<details><summary>Evidence</summary>

Red check: replacing `begin_nested()` with a plain block plus explicit `flush()` makes the new test fail at `commit()` with `PendingRollbackError ... (sqlite3.IntegrityError) UNIQUE constraint failed: history.id`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort; test added on the review branch, passes, and fails red without the savepoint.

</details>
