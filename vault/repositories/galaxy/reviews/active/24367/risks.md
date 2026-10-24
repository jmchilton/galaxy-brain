Risk profile gx_risk_assessment via Claude Opus 5.5 at low effort; reviewed commit 63c6cbf9eb3.

Mostly a two-way door: no API, schema, or config changes, and it reverts cleanly. The one-way part is per job: a resubmission whose mapping raises is now failed to `error` for good, where before it stalled the handler but could still run after an admin fix.

<details><summary>Risk Details</summary>

- The new `except Exception` branch fails resubmitted jobs on any mapping error, including transient ones (DB hiccups, a TPV rule or config bug during a deploy). Before, those jobs blocked dispatch but survived; now they end as user-visible errors and the user has to rerun them.
- It matches how the new-job path already handles these errors, so admins see one behavior on both paths rather than a new policy.
- Setting the `__fail__` placeholder destination before `fail()` means failure handling no longer re-evaluates the tool's default destination for these jobs. Any admin hook that relied on `fail()` remapping (for example, destination-specific failure handling) won't run for them.
- Deferred resubmissions (`JobNotReadyException`) now stay in `resubmitted` and are retried on every poll. Nothing caps this, so a job a rule always defers waits forever and is mapped again on each poll.
- This targets the release_26.2 branch, so it reaches deployers in a point release. The change is small and contained to `JobHandlerQueue.__handle_waiting_jobs`.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether failing on every exception is the right call for resubmissions, or whether only `JobMappingException`/`failure_message`-bearing errors should fail the job while unexpected errors are logged and skipped (retried next poll) without blocking other jobs. That choice decides whether a transient TPV or config error during a deploy wipes out in-flight resubmissions.

Also check that skipping destination remapping in `fail()` through the `__fail__` placeholder is acceptable for resubmitted jobs. The unit test harness reimplements `fail()` rather than using `JobWrapper.fail`, so this interaction is covered only by the mock.

</details>
