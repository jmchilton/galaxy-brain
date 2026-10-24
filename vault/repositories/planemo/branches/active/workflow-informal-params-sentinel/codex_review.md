# Codex review debrief

Codex (read-only, `git diff origin/master...HEAD` at `66054950`) raised one finding; not acted on — it's a policy call for John.

- **NEEDS-DECISION — fail-open on run-data errors** (`planemo/galaxy/activity.py:133`). If the `style=run` fetch fails, planemo warns and invokes without `replacement_params`, so the sentinel and the job-file rejection are skipped. Codex wants fail-closed. The normal review asked for fail-open because Galaxy's run-form endpoint raises on missing tools, cycles and empty workflows that invoke may tolerate, and fail-closed would break runs that work today. Kept fail-open; the warning is loud. Alternative: fail-closed only on transient HTTP errors.

<details><summary>Full review</summary>

Files reviewed: activity.py, api.py, config.py, workflows.py, tests, test data. Unit tests 10 passed; Galaxy-backed test not run.

P2 correctness: "Stop invocation when informal-parameter discovery fails" — catching every discovery error and returning {} invokes with replacement_params=None, bypassing sentinel and job-dict rejection. Scenario: run-data GET exhausts retries, invoke POST succeeds, output keeps `${undeclared}`.

</details>
