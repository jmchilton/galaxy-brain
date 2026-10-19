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
