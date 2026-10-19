

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md).

</details>

## Automated Review Findings

### About

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

### P3 1: No test pins how resubmitted and non-resubmitted jobs interact at the limit (implementation verified)

Every new test case uses only resubmitted jobs, and the new job in `test_resubmitted_jobs_at_limit` is checked after both resubmits have moved to `queued`. So nothing pins either side of the `other_jobs` asymmetry: a new job must still be refused while a resubmit waits in `resubmitted` (the "resubmits keep priority over new jobs" claim in the description), and a resubmitted job must still count queued or running jobs that weren't resubmitted. Breaking either branch of `other_jobs` leaves the suite green.

A short case covers both:

```python
def test_resubmitted_jobs_and_other_jobs_at_limit():
    app = create_mock_app()
    app.job_config.limits.destination_user_concurrent_jobs["one"] = 1
    job_destination_mock = create_mock_destination()
    resubmitted_job_wrapper = create_job_wrapper(app, user_id=1, state="resubmitted", destination_id="one")

    # A waiting resubmitted job keeps priority over new jobs
    new_job_wrapper = create_job_wrapper(app, user_id=1)
    assert new_job_wrapper.queue_with_limit(new_job_wrapper.get_job(), job_destination_mock) is False

    # Queued or running jobs that weren't resubmitted still block resubmitted jobs
    create_mock_job(app, user_id=1, state="queued", destination_id="one")
    resubmitted_job = resubmitted_job_wrapper.get_job()
    assert resubmitted_job_wrapper.queue_with_limit(resubmitted_job, job_destination_mock) is False
```

<details><summary>Evidence</summary>

This test is a regression guard, not a reproducer. It passes on both the base and the PR head. It fails under each of two mutations of `other_jobs`, while the existing 10 tests still pass:

- New jobs ignore resubmitted rows (`else` branch changed to `state != RESUBMITTED`).
- Resubmitted jobs ignore non-resubmitted rows (first `or_` term changed so it never matches).

</details>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at medium effort.

## Risks

Risks are minimal: this change doesn't lock Galaxy into a choice that's hard to change (a two-way door). It only relaxes an internal scheduling predicate. There are no API, schema, config, or user-facing changes, and reverting restores the previous (deadlock-prone) behavior exactly.

<details><summary>Risk Details</summary>

- A not-ready lower-id resubmit (in its `__resubmit_delay_seconds` window, or assigned to a handler that isn't running) holds up higher-id resubmits sharing a limit, including other users' jobs under destination total or tag limits. Before the PR all of them were blocked, so this is not a regression. It is documented in the code comment.
- The handler pre-check still double-counts resubmits for `registered_user_concurrent_jobs`. That can delay new jobs by a loop. This already happened before the PR and is deferred.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that the counted-state invariant holds on their deployment, meaning resubmitted jobs persist their new destination before entering `resubmitted`. mvdbeek's Postgres concurrency results already cover the main multi-handler worry.

</details>
