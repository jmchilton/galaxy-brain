# Implementation debrief

**STATUS: READY.** Base `dev` (merge-base `ab008a1a7cfe`), head `47e2af2f82d`, 6 commits, pushed to `jmchilton/pr_24607_followup`. Re-scoped once. Alt branch: `pr_24607_followup_alt_original_scope` (`d5f130d73ac`).

Follow-up to merged #24607. It started as the four `pr_24607_review_0` review commits cherry-picked onto dev. Hardening expanded it so that startup recovery logs the actual reason, including the owner losing the execute role.

## Final commits

1. `c82dc579c05` Baseline tests: queued user tool job fails when user leaves execute-role group (API).
2. `9b767c5e05a` Spec the JobHandlerQueue mock in startup unit test.
3. `9d4078e9c00` Baseline tests: startup fails job whose tool left the tool config.
4. `76aa14edd1f` Extract startup tool-availability check into `_tool_unavailable_reason(app, job)`, plus the `TOOL_DISABLED_MESSAGE` constant. No behavior change.
5. `112eb731fd3` Log distinct startup reason when a dynamic tool uuid lookup fails: `(uuid ...) unavailable: <error>`.
6. `47e2af2f82d` `DynamicToolManager.ensure_job_owner_can_run(job)`. Startup checks it before the uuid lookup, which otherwise swallows the permission error, and logs `not usable by the job's owner: ...`.

Commits 1–3 are test-only and pass on dev, so they can be split into their own PR.

## Choices

- **Base `dev`:** coverage plus admin log wording. No user-visible behavior change.
- **`prepare()` unchanged:** it keeps its inline role check. Open #24635 (release_26.2) adds a hunk right after it. Follow-up: switch it to `ensure_job_owner_can_run` after #24635 merges forward. #24635's hunks still apply cleanly to HEAD.
- **Mock-only `prepare()` test kept:** the original plan dropped `test_job_wrapper_user_tool.py`'s mock-only test. #24635 extends that file, and the file runs the inherited `BaseWrapperTestCase` tests for user tools, so it stays.
- **User-facing message unchanged:** "This tool was disabled..." stays, as #24607's verified review decided.
- **Codex round 1:** the owner-specific wording blamed the owner for deactivated public dynamic tools. Fixed by using neutral `unavailable:` wording for the fallback.

## Validation

- Unit tests pass at every commit. At HEAD there are 32 across the startup, manager, user-tool loading and job wrapper test files.
- Red checks:
  - The API group-removal test fails without #24607's fix (state `ok`).
  - The real-chain role-loss test fails against both dev's lib and the alt's lib.
  - The manager role test fails when the role check is reduced to only checking for a missing user.
- API tests were run one at a time and all 3 pass. They were last run on commit 1, which is unchanged since.
- Check-branch: `make format` made no changes. mypy shows only 6 `no-untyped-def` errors on new test functions, the same kind the base files already have; lib is clean.
- No CI run yet.

## Process

- First hardening pass ([earlier_drafts/1/](earlier_drafts/1/)): test challenges, codex (1 fix), thermo (helper extraction), baseline refactor, scope evaluation (EXPAND).
- Re-scope: [implementation_rescope_debrief.md](implementation_rescope_debrief.md), review in [subagents/rescope_review.md](subagents/rescope_review.md).
- Second hardening pass: [test challenges](test_challenges_debrief.md) (real-chain test, 2 mock-only tests dropped), [codex](codex_review.md) (no findings), [thermo](thermo_nuclear_review.md) (constant hoist), [baseline refactor](baseline_refactor.md) (6 commits, new baseline test), [scope evaluation](scope_evaluation.md) (KEEP).
- Skipped:
  - performance challenge: no queries or endpoints changed; only one extra startup role check per private-tool job
  - E2E polish and screenshots: no UI
  - brain research: registered after the fact
- Earlier debriefs cite SHAs from before the rewrite. `baseline_refactor.md` maps them to the current ones.

## Open questions for John

1. Startup role loss: show the same user-facing message as `prepare()` ("User is not allowed to run unprivileged tools") after #24635 lands?
2. Split commit 1 (API baseline test) into its own PR against `release_26.1`/`26.2`, or keep everything on `dev`?
3. Add a `Job.user_defined_tool` property now, or together with the `prepare()` follow-up?
4. Should a user deactivating their own tool stop its queued jobs? Today `owned_unprivileged_statement` ignores `UserDynamicToolAssociation.active`. That's a separate issue; scope evaluation found it.

## Follow-ups (from scope evaluation)

- After #24635: `prepare()` adopts `ensure_job_owner_can_run`. Possibly one job-level gate for user tools covering both role and container.
- Suspected but not reproduced: admin `deactivate()` does `del toolbox._tools_by_uuid[uuid]` on a per-process lazy cache and may raise `KeyError`.
- `managers/workflows.py:224` could use the existing `WorkflowStep.user_defined_tool`.
- A shared `USER_TOOL_EXECUTE` test-user fixture.

```
created .../pr_24607_followup/differential-review/snapshots/20261103T000537Z-hardening-47e2af2f82d1.json
  hardening @ 47e2af2f82d1 vs origin/dev (merge-base ab008a1a7cfe)
  since 20261102T233415Z-implementation-e6efabbcbf4e:
    commits: 2 same, 0 rebased, 1 changed, 3 new, 3 dropped
    hunks:   5 carried, 4 changed, 8 new, 3 dropped
```
