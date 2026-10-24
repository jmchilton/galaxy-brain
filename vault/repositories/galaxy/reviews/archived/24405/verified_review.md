### P3 1: Collapse the new comment block (implementation verified)

The new five-line comment stacks under the existing five-line comment and largely repeats the commit message. The existing paragraph also still says "Savepoint scopes the flush", which is now misleading since the savepoint only scopes the ToolSource/ToolRequest flush.

Collapse to one line and keep the rationale in the commit message:

```python
    # Flush pending scheduler state first; begin_nested() would flush it inside the best-effort block.
    trans.sa_session.flush()
```

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort; implemented on the review branch with `test_modules.py -k capture` passing.

</details>

### P3 2: Cover savepoint isolation of ToolRequest persistence failures (implementation verified)

The fix relies on a split: unrelated pending state fails loudly (now tested), while failures inside `begin_nested()` stay best-effort and leave the session usable. That second half is untested.

Add a sibling test where the flush fails inside the savepoint: a duplicate-PK `History` that reaches the session only through `tool_request.history`. Assert `(None, None, None)` is returned with one warning, and that a later `commit()` still persists a History added before the call.

<details><summary>Evidence</summary>

Red check: replacing `begin_nested()` with a plain block plus explicit `flush()` makes the new test fail at `commit()` with `PendingRollbackError ... (sqlite3.IntegrityError) UNIQUE constraint failed: history.id`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort; test added on the review branch, passes, and fails red without the savepoint.

</details>
