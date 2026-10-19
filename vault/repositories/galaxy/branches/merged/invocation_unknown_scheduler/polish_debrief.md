# Polish debrief

2026-10-15. Final head `56a8ac23045`, base `release_26.1` (`92e66c53394`).

## Retarget

At John's request, rebased the single commit from `dev` onto `release_26.1` (no conflicts) and force-pushed to the fork.

## CI

Fork CI on the dev-based `602b9dd46b7` was all green except "Test Galaxy packages". Its only error is mypy `no-untyped-call` in `galaxy/security/ssh_util.py`, which is unrelated. Fork CI for the 26.1 SHAs was still queued at hand-off. `56a8ac23045` needs a greenish run before the PR opens.

## Checklist (GENERAL + WORKFLOW_RELATED)

[checklist_evaluation.md](checklist_evaluation.md). **The subagent caught a real blocker:** the guard used `self._workflow_scheduling_manager`, which only exists on `dev`. On 26.1, every non-empty scheduler would have returned a 500. The clean rebase hid this, because nothing on 26.1 had been run.
- Fixed by reading `trans.app.workflow_scheduling_manager`, the same manager `queue_invoke` uses. The fix also drops the redundant per-loop reassignment of the scheduler ID.
- Re-verified on 26.1. Red, with the base service file: the unknown scheduler gets a `200` and the invocation is created in state `new`. Green: all cases pass.
- black, ruff and mypy (from `lib/`) report nothing new in the changed file.
- Merges cleanly into `dev`.

Lesson: a clean rebase across release branches can still break code that uses a dependency added on `dev`. Run the branch's own test on the new base before handing it off.

## Strengthening

Tasks applied:
- Added a `""` case to `test_run_with_scheduler`, so the "empty falls back to the default" claim is tested. 4 passed in 42s.
- Fixed two wrong claims in the description:
  - `queue()`'s caller is `queue_invoke()`, not the service method.
  - "planemo users" was wrong: Planemo, BioBlend and the client run form never send `scheduler` (checked in the local clones).
- Added a bolded audience sentence saying only direct API callers can hit the new 400.
- Made "nothing is created" concrete: no `new_history_name` history is made.

I didn't re-run the checklist subagent. The only item affected is the unit-test answer, which I updated by hand.

## Left for John

- No user report backs this. Confirm `release_26.1` rather than `dev` is the target you want.
- Empty or null `scheduler` still falls back to the default rather than being rejected. Changing that would widen the scope, so it wasn't done.
- A registered but passive scheduler would still be accepted and hang. Core ships none, so this was left alone.
