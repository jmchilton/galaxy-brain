# Test challenges review — PR #24867

Profile gx_test_challenger · Claude Opus 5.5 · effort low · reviewed commit 59603c8e04222901ba5a13da34c5025e87c6be25

Verdict: the tests are good for a small release fix. The regression test fails before the fix and passes after it. No P1 or P2 findings.

### P3 1 — Stale-response guard untested (optional)
The `searchCount` guard against out-of-order responses is new behavior with no test. Add a jest test: delay the first `/api/trs_search` response, change the query, release both responses, and assert only the newer results render and `loading` ends false.

### P3 2 — Server-switch test asserts too little (optional)
The "clears the query when switching" test only checks the input is empty. Also record `/api/trs_search` calls and assert none sends the old query with `trs_server=workflowhub`. Results from the previous server should be gone too.
