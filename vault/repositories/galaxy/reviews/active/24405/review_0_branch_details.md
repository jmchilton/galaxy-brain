`pr_24405_review_0` sits on the reviewed commit `e277999b9f0` and makes two small changes: it collapses the PR's new comment block to one line (fixing the stale "Savepoint scopes the flush" wording above it), and adds a unit test pinning the other half of the fix, that a flush failure inside the ToolRequest savepoint stays best-effort and leaves the outer session committable.

- `f6af4743ee5` Collapse ToolRequest pre-flush comment — replaces the five-line comment with one line and narrows the existing paragraph to the ToolRequest flush.
- `00fc12580ba` Test savepoint isolates ToolRequest flush failures — a duplicate-PK history reachable only via the ToolRequest fails the savepoint flush; capture returns `(None, None, None)`, warns, and a later commit still persists pending state.
