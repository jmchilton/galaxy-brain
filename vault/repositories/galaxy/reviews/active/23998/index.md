# galaxy #23998 — Keep uploaded files paired with their list collection elements

[PR #23998](https://github.com/galaxyproject/galaxy/pull/23998) · Status: active; initial review complete 2026-10-11. Recommendation: **approve**. Delivery: approval draft unposted; no GitHub comments or reviews submitted.

Reviewed HEAD: `68639a37fbb8f4f9ed06be67f7ad691746de933c` (base `dev`; exact pre-PR parent `08ec4d81a173535b9ffa7865d56bc5ce0c1619b4`). Author: davelopez. Final GitHub check: open, out of draft, unchanged HEAD, 30 successful checks, no existing comments/reviews.

- [Initial review and risks](review-2026-10-11.md)
- [Unposted approval draft](draft-review.md)
- [Validation evidence](validation-evidence.txt)
- [Independent client regression probes](upload.review23998.test.ts)

John explicitly requested this review on 2026-10-11 alongside #24013, overriding the soft preference to leave Marius's recent review request room. Dedicated reviewer inspected the complete three-file diff and surrounding upload, collection, and cancellation paths.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23998/`; clean and retained while PR is open. Local tests used an isolated temporary client copy with exact locked dependencies. No Galaxy source or shared environment was edited. Temporary source copy/dependencies removed after recording evidence; no test server or browser was started. CI artifact cache had no artifacts because its runs succeeded; successful job logs were read directly.

Risk: narrow, reversible client correction with a scientifically significant benefit: collection labels match actual uploaded content. Reverting code cannot repair histories already imported with wrong sample labels; neither does this patch repair historical affected uploads. It creates no new API or persisted schema contract. Details and remaining limits are in the review.
