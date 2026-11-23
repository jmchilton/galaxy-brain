<!-- Profile: gx_risk_assessment; model: Claude Opus 5.5; effort: low; reviewed commit: f207f12dd5e528573a50cabca345d31fac34f76e -->
Mostly a two-way door - no API, schema or workflow-format change - but it lands on `release_26.0` and changes when and how often users get job emails, and moves the email post job action out of the job's settling transaction across every settle path (finish, fail, cache copy, pause, handler skip).

<details><summary>Risk Details</summary>

- Users of map-overs with an email PJA get one summary instead of one email per element; anyone relying on per-element mails (or filters on the old body text) sees different content.
- A map-over counts paused jobs as settled, so the summary goes out while elements wait on resume; resuming them later sends another summary.
- Cancelling a map-over now sends no email at all from the deleted jobs.
- Two jobs committing at nearly the same moment can each see the map-over settled and send the summary twice (acknowledged in a docstring).
- Emails now run after commit: a crash between commit and send drops the email, where before it would have been rolled back with the job state.
- Every settle path now has to remember `queue_after_commit_actions` + `run_after_commit_actions`; a missed call silently drops emails, and the handler loop gains a second commit per pass.
- `send_mail` with a `mock_emails_to_path` pointing at a directory now writes one file per email; test-only, but it changes a shared util.

</details>

<details><summary>Risk Review Advice</summary>

Check that each settle path (finish, fail, `_pause_job_if_over_quota`, cached-job copy, handler skip/pause, celery `setup_fetch_data`) queues before and runs after its commit, and that no path still runs `EmailAction` inside the transaction. Decide whether summary-on-pause and silence-on-cancel are wanted for a release-branch fix.

Weigh whether the after-commit machinery is too broad for `release_26.0` versus a narrower fix on `dev`; the race producing duplicate summaries is a lesser regression than today's per-element flood, but should be a conscious call.

</details>
