Risks are minimal - this client-only change adds no API or developer-artifact commitments, so it doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Registered users on servers with quotas on several sources now load the per-source usage on every page, and each storage usage refresh adds a second request; the cost is easy to remove but lands on large deployments.
- The warning asserts that jobs writing to a storage are on hold, duplicating the server's over-quota rule on the client; if that rule changes, the message could mislead until the client follows.
- Storage names come from the user's selectable storages and fall back to the raw label, so the same source can appear under a different name once the object stores load, or expose an internal label if no selectable storage uses it.
- Hovering the meter on multi-source servers now opens a popover instead of a tooltip, a small and self-explanatory change to learn.

</details>

<details><summary>Risk Review Advice</summary>

Deployers of multi-source instances are the people to consider: check that the added per-source request is acceptable at their scale, and that their quota source labels are fine to show when no selectable storage uses them.

The PR notes a small conflict with #24738 in how the user store starts watching the storage usage, so whichever merges second should recheck that startup path.

</details>
