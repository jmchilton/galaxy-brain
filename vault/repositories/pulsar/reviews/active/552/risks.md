This is a two-way door: the change adjusts completion reporting and adds a per-job failure marker, without changing output formats or introducing destructive operations.

<details><summary>Risk Details</summary>

- Clients polling for status will now receive `failed` when output staging fails, matching the terminal callback; this can change downstream retry and failure-handling behavior.
- Completion now depends on recording the staging outcome before writing the `postprocessed` marker. Failures writing job metadata deserve attention because they can leave clients seeing `postprocessing`.
- Rolling back the code leaves harmless failure-marker files behind, but restores the previous polling behavior for affected jobs; rollback cannot retract terminal statuses already consumed by clients.

</details>

<details><summary>Risk Review Advice</summary>

Review the ordering of failure-marker writes, completion-marker writes, and terminal callbacks, including exceptions and restart recovery. Confirm successful recovery clears a stale failure marker and that failed staging is reported consistently to both polling and callback clients.

The added tests cover failed staging and recovery after a recorded failure. Human review should also consider metadata-write failures and restart timing around the completion marker, where filesystem state determines whether staging is retried.

</details>
