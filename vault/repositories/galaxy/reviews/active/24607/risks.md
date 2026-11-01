Mostly a two-way door: the one lasting behavior it sets is that revoking the `Custom Tool Execution` role, or deleting the role, now also fails that user's queued and not-yet-prepared private user-defined tool jobs. The PR documents this, and later releases would have to keep it.

<details><summary>Risk Details</summary>

- Jobs that were valid when queued now fail at prepare time if the owner has lost the role. A permission change by an admin now hits work already in flight, not only new submissions.
- The check uses `job.user`. Anonymous or user-less jobs that run a private dynamic tool now always fail at prepare (`ensure_can_use_unprivileged_tool` accepts `None` and rejects it).
- Public dynamic tools (`dynamic_tool.public`) skip the recheck, so this only covers the private user-tool path.
- The job handler's startup recovery now treats `ObjectNotFound`/`ToolMissingException` from a uuid tool lookup as "tool removed" and fails those jobs instead of raising. This is wider than role loss: it also covers definitions that no longer load.
- Runner code paths (base runner and Pulsar) now treat `InsufficientPermissionsException` as a user-facing rejection, with an info log and no traceback. The exception message is shown to the user as the job's misc_info.
- Targets release_26.1. The changes are small and easy to revert, and there are no schema or API changes.

</details>

<details><summary>Risk Review Advice</summary>

Check that failing already-queued jobs on role revocation is the behavior admins want on a stable release, as opposed to only blocking new submissions. Also check that widening the startup `except` in `handler.py` cannot hide real lookup errors for non-user tools.

The new API test relies on timing: a 10s sleep keeps the user-tool job queued. Watch it for flakiness on slow CI.

</details>
