---
upstream_base_branch: dev
parent_branch: tes_task_state_polling
---
# Fail Pulsar TES jobs whose TES server stays unreachable, and retry cancelling their tasks

- [Open PR](https://github.com/jmchilton/galaxy/compare/tes_task_state_polling...tes_task_state_polling_unreachable?expand=1) (against the parent on the fork; the parent isn't upstream yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling_unreachable)

## Status

Rebased on 2026-11-15 onto the retargeted, hardened parent `fdb30869fa8` (on `release_26.2`); now two commits, the unreachable timeout `ebc9e2617f5` and the cancel retry `dc32408c885`, with the single-log and SYSTEM_ERROR job-info fixes moved down into the parent; not hardened yet (the unreachable timeout was checked live in stage 5 and the cancel retry in stage 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); see [HARDENING.md](../../../../../projects/wes_tesp_api/HARDENING.md)).

No PR.

Fork CI on `dc32408c885` not checked yet.

## Notes

- New runner option `tes_unreachable_timeout` (default 3600 s, 0 retries forever), next to the parent's `tes_status_check_interval` and `tes_status_grace_period`.
- New runner option `tes_cancel_retry_timeout` (default 86400 s, 0 tries once): a cancel that fails because the TES server is unreachable is retried by the monitor thread, 10 s later and then at most 120 s apart. In memory only; a Galaxy restart drops pending retries (shutdown logs them). See the debrief's stage 6 section.
- Moved to the parent on 2026-11-15 (parent `2453e458bf6` and `fdb30869fa8`): not crediting tesp-api's single whole-task log to "Executor 0 (pulsar-submit)", and naming a SYSTEM_ERROR task's reason from its system logs. The old head `025f1256ec3` still has them here.
- Rebase note: the parent's message thread now adds task watches for early final statuses; since this branch runs the monitor thread for cancel retries even with `tes_status_check_interval: 0`, `dc32408c885` gates that on the check interval, not `poll` (test `test_final_status_with_the_task_checks_off_adds_no_watch`). 75 TES tests pass, 126 with the neighbouring Pulsar runner tests.
- The frontmatter still says `upstream_base_branch: dev`; the parent now targets `release_26.2`. Whether this branch follows it onto the release branch is open (the parent's scope evaluation suggests keeping it a separate PR, easy to leave off 26.2).
- Demo-only ports, not for a PR: `tes_task_polling_v26.1.2` at `1f7cae33d5f` (`a1b53d59234`, then the cancel retry `031b96fe16a`, then the SYSTEM_ERROR info) and `wes_tes_demo_fixes_v26.1.2` at `b317bc12545` (`3585089e925`, then `8b3166c80fb`, then the SYSTEM_ERROR info). `tes_native_staging_v26.1.2` stays stacked on `a1b53d59234`. The demo worktree `~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2` is detached at `8b3166c80fb` (cancel retry, not yet the SYSTEM_ERROR info); check out `b317bc12545` and restart Galaxy for both.
- Live check for the cancel retry: `scripts/tesp/acceptance/unreachable-cancel.sh` in `~/projects/repositories/galaxy-wes-tes` (demo commit `6f50454`), also the follow-up hook of `make acceptance`'s `unreachable` scenario.
- Documentation of the whole Galaxy WES → tesp-api line: the [wes_tesp_api project](../../../../../projects/wes_tesp_api/index.md).

## Review materials

- [Implementation](implementation_debrief.md)
