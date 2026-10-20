# Initial review — galaxyproject/galaxy#24252

- Profile: default
- Model: Claude Opus 5.5 (claude-opus-5-5)
- Effort: low
- Reviewed commit: 9246280e6eb (merge-base f66d1d17a4f, release_26.0)

## Summary

One-character-class fix: the `supports_returning()` probe ran `UPDATE job SET tool_id=abc ...`, where unquoted `abc` is a column reference, so the statement always errored and the probe always returned False on every backend. Quoting the literal makes the probe work. Two tests added (sqlite always, postgres when configured); they call `supports_returning.cache_clear()` around the `lru_cache`. Ran `test_database_utils.py -k returning` locally: sqlite passed, postgres skipped (no postgres URI).

Fix is correct and minimal. Tests are proportionate and exercise real engines rather than mocks. No actionable findings.

## Findings

None (P1/P2/P3).

Non-blocking observation (not a finding): the fix *activates* a dormant path. `JobHandlerQueue`/grabber (`lib/galaxy/jobs/handler.py:169`, `:208`) now adds `.returning(id)` and does `fetchall()` + rollback-on-empty for `db-skip-locked` / `db-transaction-isolation` handler assignment. That path was effectively unexercised in production since the probe broke. Reading it, it looks sound, but it is the real behavior change on a release branch.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Turns on the RETURNING branch of DB-based job/invocation grabbing for deployments using `db-skip-locked` or `db-transaction-isolation` assignment; that code has been dormant, so any latent bug there surfaces now.
- Easily reverted; no API, schema, or artifact-format changes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should glance at `grab_unhandled_items()` in `lib/galaxy/jobs/handler.py`, the code the fix re-enables, rather than the one-line probe itself. A deployment using DB-based handler assignment on postgres is the place to watch after release.

</details>
