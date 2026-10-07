PRs To Review:
- 23223 — hold date (Tue 2026-09-29) passed; Sergey's 09-28 reply (TPV vs real-user) unanswered; user decision: reply and/or merge
- 23560 — still draft; re-review when it leaves draft
- 22976 — still draft; re-reviewed at `cf8ffbd3108`: close; our fixes (thriftpy2 dep, converter versions, metadata names) in fork PR fairytalesbykcc#2, ball with author; draft review unposted (needs update)
- 23866 — author converted to draft 10-03; user requested changes (pattern-captured unknown ext should match explicit tool-XML unknown format handling); ball with author
- 23898 — reviewed at `c6f8234b5e4`: runner change fine; blocked on Pulsar release (git pin + PULSAR_GALAXY_LIB build vars must revert; keep #533 shims for compat); draft review unposted
- 23857 — reviewed at `56dfc2b6fe8`: request changes (small: drop skip_instance_cache — leaks pruner task per op; add mock test; share path helpers w/ ipfs); pushed 3 cleanup commits (no unit test, per user) to author branch → head `f100983e424` 10-06; draft review unposted (needs update)
- 23944 — reviewed at `cd486038e4b`: comment, approve after change_entry force_read fix; draft review unposted
- 23952 — reviewed at `0fe0a3c1622` (stacked on 23950): approve; optional `e.repeat` guard; draft review unposted
- 23953 — reviewed at `9ac1627fc79` (draft; paired w/ 23956): approve w/ nits (own range parser vs starlette/webob; stale body); draft review unposted
- 23956 — reviewed at `4a81462fae5` (paired w/ 23953): approve-leaning, settle content_path semantics (sanitized store_root, inputs vs outputs, deferred); draft review unposted
- 23951 — reviewed at `66e01e4015a`: comment (relative-path imports slip past regex); draft review unposted
- 23950 — reviewed at `626cdbdc772`: approve; draft review unposted
- 23949 — reviewed at `4b6832e2ec3`: approve; draft review unposted
- 23925 — reviewed at `58f87d38527`: comment, approve after focus-ring contrast fix; draft review unposted

PRs to Skip For 7 Days:

PRs Blocked:
- 23233 is blocked until the review we already made is responded to.
- 23234 is blocked until 23233 is responded to.
