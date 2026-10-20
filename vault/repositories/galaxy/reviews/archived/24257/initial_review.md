# Initial review: galaxyproject/galaxy#24257

- Profile: `default`
- Model: Claude Opus 5.5 (`claude-opus-5-5`)
- Effort: medium
- Reviewed commit: `d48fe03e0e7bc744d033a8ac689b0df9e98cd5a0` (base `release_25.1`, merge-base `6cc95b16284`)
- PR: "[25.1] Don't let resubmitted jobs block each other on concurrency limits" by davelopez, fixes #22974

## Summary

Small, well-targeted fix. `queue_with_limit()` (`lib/galaxy/jobs/__init__.py`) gates the `new/resubmitted -> queued` transition on five count subqueries over `queued`/`running`/`resubmitted` jobs. A resubmitted job counted itself and every other resubmitted job, so N resubmits against limit <= N deadlocked. The PR adds one `other_jobs` predicate to all five subqueries:

- resubmitted job: count non-resubmitted jobs, plus resubmitted jobs with a lower id (self excluded);
- any other job: exclude only itself (no-op in practice; only `new` jobs reach this path).

Correctness checks I did:

- **Strict relaxation.** For every job the new count is <= the old count, so nothing that could queue before is now refused. New jobs see the same counts as before, so resubmits keep priority over new work.
- **No overshoot.** A resubmitted job is counted in every state it passes through (`running`/`queued` -> `resubmitted` -> `queued`). `set_job_destination()` persists the new `destination_id` before `mark_as_resubmitted()` (`runners/state_handlers/resubmit.py`), so it already counts against the target destination while it waits. Resubmit k queues only if `queued+running + (k-1 lower resubmits) < limit`. That keeps `queued+running <= limit`, and the lowest-id resubmit waits only on real `queued`/`running` work, so the queue drains.
- **Concurrency.** mvdbeek tested concurrent-transaction behavior on Postgres 15 in the PR thread. Parallel resubmits can't overshoot. The new+new overshoot already existed (#19824).
- **Red/green.** I ran `test/unit/app/jobs/test_queue_limit.py` at PR head: 10 passed. With the base `lib/galaxy/jobs/__init__.py` swapped in (scratch copy), all 6 new test cases fail and the 4 adjusted "at limit" tests pass. The tests pin the fix.
- **Probes** (scratch only, not in the PR). (a) A new job at limit 1 behind a not-yet-queued resubmit is refused, both before and after the PR. (b) With limit 1 and two resubmits, the higher id is refused and the lower id queues. This fails on base and passes on head.
- The existing "at limit" tests re-queued an already-queued job and relied on it counting itself. Switching them to a second job is a legitimate correction, not a weakened test: the assertions are unchanged and the scenario is more realistic.

The amended code comment covers the two non-blocking notes from mvdbeek's approval: self-exclusion matters only for resubmits, and a not-ready lower-id resubmit holds up higher ones. The third note (handler pre-check double-counts resubmits) is explicitly deferred.

## Findings

No P1 or P2 findings.

### P3 1: New-job priority behind pending resubmits isn't pinned by a test

The PR description says "New jobs still count every resubmitted job, so resubmits keep priority over new jobs." The `other_jobs` split is what keeps that true. `test_resubmitted_jobs_at_limit` checks the new job only after both resubmits have already moved to `queued`, so it would pass even if new jobs stopped counting `resubmitted` rows. A short case, for example limit 1 with one resubmit still in `resubmitted` and a new job that must be refused, would protect the asymmetry from future edits to `other_jobs`. Probe (a) above is that test. It passes on both base and head, so it guards behavior rather than reproducing the bug. Optional.

### P3 2 (follow-up, not for this backport): five near-identical count subqueries

The five subqueries differ only in their scope predicate (user, user+destination, session, destination, destination set). This PR has to add `other_jobs` to each one. A small helper such as `_active_job_count(*scope_conditions)`, which applies the state list and `other_jobs` once, would remove the duplication. It would also make it harder for a future sixth limit to miss the self/ordering rule. The duplication predates this PR, and a release-branch fix should stay minimal, so this belongs in a `dev` follow-up, possibly alongside the deferred handler pre-check alignment (`handler.py` `__cache_*_job_count*`, which still counts resubmits differently).

## Notes (non-actionable)

- `job.state == RESUBMITTED` reads the in-memory ORM state. On the handler path the job comes from a fresh `resubmit_jobs` query, so it is current. If the state were somehow stale, the code falls back to "exclude self". That still behaves better than before.
- Mocked destination tags are `["one", "two"]`, and the tag-limit case uses `"two"`, so it really exercises the tag path rather than colliding with destination id `"one"`.
- Imports are at module top (`or_`, `pytest`). Comments are justified and not obvious.

## Risks

Risks are minimal: this change doesn't lock Galaxy into a choice that's hard to change (a two-way door). It only relaxes an internal scheduling predicate. There are no API, schema, config, or user-facing changes, and reverting restores the previous (deadlock-prone) behavior exactly.

<details><summary>Risk Details</summary>

- A not-ready lower-id resubmit (in its `__resubmit_delay_seconds` window, or assigned to a handler that isn't running) holds up higher-id resubmits sharing a limit, including other users' jobs under destination total or tag limits. Before the PR all of them were blocked, so this is not a regression. It is documented in the code comment.
- The handler pre-check still double-counts resubmits for `registered_user_concurrent_jobs`. That can delay new jobs by a loop. This already happened before the PR and is deferred.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that the counted-state invariant holds on their deployment, meaning resubmitted jobs persist their new destination before entering `resubmitted`. mvdbeek's Postgres concurrency results already cover the main multi-handler worry.

</details>
