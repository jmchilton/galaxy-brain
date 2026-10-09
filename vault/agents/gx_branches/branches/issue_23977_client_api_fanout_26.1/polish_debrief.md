# Polish debrief: issue_23977_client_api_fanout_26.1

2026-10-08. Branch unchanged at `423bd6a3ec2` (no commits from polishing).

## CI

Fork CI on `423bd6a3ec2` was still queued throughout (fork runner backlog); no reds to diagnose. Checklist subagent ran the 15 touched test files locally under node 22.20.0: 128 tests pass.

## Checklist (GENERAL + WORKFLOW_RELATED)

Subagent: all items pass; human-read item left unchecked. Notes: `memoizeUntilRejected` unused here (byte-identical shared file, covered in the description); `WorkflowInvocationState` loading test is mock-driven (weakest new test); `historyStore` "stops retrying" syncs on `console.warn` count.

## Red on base

Ran the branch's tests against `release_26.1` sources (new `retryGate.ts`/`sharedPromise.ts` kept): every test fails except the new-utility suites. Key numbers used in the description: concurrent 429 retries base `[1000,1000,1000]` vs `[500,750,1000]`; successive base `0,1,2,3 s` vs `0,1,3,7 s`; invocations grid reload 4 vs 2 history requests; hidden badges fetch `/counts` on base.

## Strengthening

Subagent fixes applied (wording only):
- My draft's "Invocation not found." claim was wrong: on base a retryable invocation failure shows the error alert at once while retries continue; "not found" only appeared mid-branch. Table row, intro and checklist reworded.
- Two-layer numbers corrected from code: middleware 3.5–7 s per attempt, gate 1–2/2–4/4–8 s; still max 16 requests, but over ~20–40 s vs ~12 s on base.
- #23510 description fixed (slowapi already on 26.1; #23510 makes rejections return 429 + `Retry-After`).
- Manual steps: nginx needs `limit_req_status 429;` (default 503); devtools blocking gives a network error, final in keyed-cache stores — step 2 now uses a 503 override.
- Added highlights: client-only / gate replaces three copies; why `ObjectPermissions`/`HistoryExport`/`DatasetPopoverLink` change.

Not done (for John):
- Optional vitest proving the two-layer budget (real middleware + keyed cache, always-429, count + time to final error). The description's numbers are derived from code.
- Question: should keyed-cache stores retry network (no-response) errors like `historyStore` does? Widens behaviour; left as is.
