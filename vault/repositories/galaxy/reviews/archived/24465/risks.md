This is mostly a two-way door: it changes job-completion transaction ordering without changing persisted formats or public API contracts, but regressions could affect output visibility and workflow progress across all jobs.

<details><summary>Risk Details</summary>

- Combining output updates, metrics, and the final job state changes transaction duration and lock ordering in a heavily used path; concurrency and deadlock behavior deserve attention, especially for mapped workflow jobs sharing user and invocation rows.
- Extended metadata imports now defer their commits to job completion. Failures later in completion can roll back more imported state, and existing discovery and metadata-tool commits mean atomicity still has exceptions.
- Hash queue failures and dependent timestamp update failures become logged, nonfatal errors after the job result is committed. Hashes may remain absent, and workflow or collection refreshes may rely on later polling rather than the usual timestamp signal.

</details>

<details><summary>Risk Review Advice</summary>

Review the transaction boundaries against real PostgreSQL concurrency, particularly mapped workflows, quota accounting, and extended metadata discovery. The added unit checks and reported PostgreSQL integration/API runs provide useful coverage; simultaneous completion of many jobs is the main operational behavior to scrutinize.

Confirm that delayed workflow/collection refresh and missing hashes are acceptable outcomes when the postcommit actions fail, and that their logs make those failures diagnosable. Rolling back the code is straightforward, though it will not replay missed postcommit actions.

</details>
