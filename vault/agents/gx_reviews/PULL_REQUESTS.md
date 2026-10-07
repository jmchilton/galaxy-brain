PRs To Review:
- 23223 — hold date (Tue 2026-09-29) passed; Sergey's 09-28 reply (TPV vs real-user) unanswered; user decision: reply and/or merge
- 23560 — still draft; re-review when it leaves draft
- 22976 — still draft; re-reviewed at `cf8ffbd3108`: close, one short change round (thriftpy2 undeclared dep, metadata names column_count/line_count vs columns/data_lines); draft review unposted
- 23866 — author converted to draft 10-03; user requested changes (pattern-captured unknown ext should match explicit tool-XML unknown format handling); ball with author
- 23898 — reviewed at `c6f8234b5e4`: runner change fine; blocked on Pulsar release (git pin + PULSAR_GALAXY_LIB build vars must revert; keep #533 shims for compat); draft review unposted
- 23857 — reviewed at `56dfc2b6fe8`: request changes (small: drop skip_instance_cache — leaks pruner task per op; add mock test; share path helpers w/ ipfs); pushed 3 cleanup commits (no unit test, per user) to author branch → head `f100983e424` 10-06; draft review unposted (needs update)
- 23944 — reviewed at `cd486038e4b`: comment, approve after change_entry force_read fix; draft review unposted
- 23925 — reviewed at `58f87d38527`: comment, approve after focus-ring contrast fix; draft review unposted

PRs to Skip For 7 Days:

PRs Blocked:
- 23233 is blocked until the review we already made is responded to.
- 23234 is blocked until 23233 is responded to.
