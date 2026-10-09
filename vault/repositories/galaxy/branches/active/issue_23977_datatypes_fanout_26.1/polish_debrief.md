# Polish debrief: issue_23977_datatypes_fanout_26.1

2026-10-08. Branch unchanged at `b2ec6aac24c` (no commits from polishing). Worktree created at `~/projects/worktrees/galaxy/branch/issue_23977_datatypes_fanout_26.1` (`client/node_modules` symlinked to the sibling worktree's).

## CI

No fork CI run exists for `b2ec6aac24c`; the push never triggered one. Re-pushing the ref (delete + push) to start it was blocked by the permission classifier. Needs John: re-push, or let the next rebase start it. Locally under node 22.20.0, the 6 touched test files pass (20 tests).

## Checklist (GENERAL.md)

Subagent: every item passes. Only flag: `dedupeInFlight` has no caller here (used by the sibling); kept, since the byte-identical shared file is John's split decision. Human-read item left unchecked.

## Red on base

Ran the branch's tests against `release_26.1` sources: 10 of 11 non-`sharedPromise` tests fail at their count/rejection assertions (`HelpText.test.ts` 25 vs 0). "refetches genomes after a failed request" passes on base — base already retried genomes; it's a guard.

## Strengthening

Subagent found the description's "next open retries" claim wrong: `UploadModal` is always mounted (static modal), so `UploadContainer` loads once per page and the alert stays until reload. Fixed table row, checklist answer and manual steps 1–3; added highlights for the unexplained 37 requests (covered: at most one `/api/datatypes` per load), release-branch behaviour change, and the shared util/unused `dedupeInFlight`.

Not done (scope or effort, for John):
- Upload dialog retry on reopen after a failure (~10 lines + test; widens scope on a release branch).
- Live devtools count on a 25+-row invocations list, base vs branch (would drop the "not re-measured" hedge).
- Optional remount test (datatype terms destroyed/remounted while request pending → 1 request); low value.
