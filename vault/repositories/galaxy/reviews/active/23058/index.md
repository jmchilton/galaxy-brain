# galaxy #23058 — Validate matched multi-input expansion errors before async job prep

[PR #23058](https://github.com/galaxyproject/galaxy/pull/23058) · Status: active; open, out of draft. GitHub state checked 2026-10-11.

[Review and history](review.md)

Recorded review snapshot: `bd562019bde`. Later review rounds and delivery history remain in the linked notes.

Current PR head: `f1e412e75c4`. The migration refreshed tracking, not the code review.

Tracking: Author merged our fork fixes (`f1e412e75c4`, 2026-10-10); CI workflows have run; 50 successful checks, 3 failed, 2 skipped. Verification/approval remains pending CI resolution.

Prior queue tracking: reviewed at `bd562019bde`: request changes; our fix in fork PR SID-6921#1; user commented 10-08; ball with author

Morning check 2026-10-11: workflow approval is no longer needed. Failed logs show a mulled external-test lookup (`KeyError: commands`), command-palette browser timeout, and integration startup/database-lock errors. These logs do not demonstrate a matched-input regression; no new code review was performed. Author said they would follow up on red CI. No user reply is pending.
