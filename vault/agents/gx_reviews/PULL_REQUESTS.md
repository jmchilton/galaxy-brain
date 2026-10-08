PRs To Review:
- 23223 — hold date (Tue 2026-09-29) passed; Sergey's 09-28 reply (TPV vs real-user) unanswered; user decision: reply and/or merge
- 23560 — still draft; re-review when it leaves draft
- 22976 — out of draft; author merged our fork PR #2 → head `fe483e8f734` 10-07; re-reviewed at `cf8ffbd3108`; draft review unposted (needs update to reflect merged fixes)
- 23866 — author converted to draft 10-03; user requested changes (pattern-captured unknown ext should match explicit tool-XML unknown format handling); ball with author
- 23898 — reviewed at `c6f8234b5e4`: runner change fine; blocked on Pulsar release (git pin + PULSAR_GALAXY_LIB build vars must revert; keep #533 shims for compat); draft review unposted
- 23857 — reviewed at `56dfc2b6fe8`: request changes (small: drop skip_instance_cache — leaks pruner task per op; add mock test; share path helpers w/ ipfs); pushed 3 cleanup commits (no unit test, per user) to author branch → head `f100983e424` 10-06; draft review unposted (needs update)
- 23944 — user approved 10-07; awaiting merge
- 23952 — user approved 10-07 (stacked on 23950); awaiting merge
- 23953 — reviewed at `9ac1627fc79` (draft; paired w/ 23956): approve w/ nits (own range parser vs starlette/webob; stale body); draft review unposted
- 23956 — reviewed at `4a81462fae5` (paired w/ 23953): approve-leaning, settle content_path semantics (sanitized store_root, inputs vs outputs, deferred); draft review unposted
- 23951 — user approved 10-07; awaiting merge
- 23950 — user approved 10-07; awaiting merge
- 23949 — user approved 10-07; awaiting merge
- 23925 — reviewed at `58f87d38527`; user posted findings as comment 10-07, asked author to fix/comment; ball with author
- 22136 — reviewed at `1b8e21cfd81`: request changes (DatasetController.default swallows /datasets/* client routes — CI red; tests use synthetic route table; fallback ignores method); draft review unposted
- 23058 — reviewed at `bd562019bde`: request changes (async validation in wrong layer — validate in JobsService.create; new test cannot pass; mvdbeek concerns unaddressed); draft review unposted
- 23942 — reviewed at `aaed58e7b28`: comment, approve after rebase (conflicts w/ dev after 23925; shed preset Vue2→3 + dropped rules; edit-path save-after-failed-test gap); draft review unposted

PRs to Skip For 7 Days:

PRs Blocked:
- 23233 is blocked until the review we already made is responded to.
- 23234 is blocked until 23233 is responded to.
