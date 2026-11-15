---
upstream_base_branch: dev
parent_branch: tes_task_state_polling
---
# Fail Pulsar TES jobs whose TES server stays unreachable, and retry cancelling their tasks

- [Open PR](https://github.com/jmchilton/galaxy/compare/tes_task_state_polling...tes_task_state_polling_unreachable?expand=1) (against the parent on the fork; the parent isn't upstream yet)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_task_state_polling_unreachable)

## Status

Implemented at `025f1256ec3` (three commits on the parent's `e3c0cc44649`: `f71ca18704d` from stage 5, the cancel retry `bd710f3b8da` and the SYSTEM_ERROR job info `025f1256ec3` from stage 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md)); the unreachable timeout was checked live in stage 5, and the cancel retry live in stage 6 through the demo ports: on tesp-api the orphaned task ended CANCELED after the server returned (demo `runs/acceptance/20261115T030823Z-tesp`, `20261115T045850Z-tesp`); see [HARDENING.md](../../../../../projects/wes_tesp_api/HARDENING.md).

No PR.

Fork CI on `025f1256ec3` not checked yet.

## Notes

- New runner option `tes_unreachable_timeout` (default 3600 s, 0 retries forever), next to the parent's `tes_status_check_interval` and `tes_status_grace_period`.
- New runner option `tes_cancel_retry_timeout` (default 86400 s, 0 tries once): a cancel that fails because the TES server is unreachable is retried by the monitor thread, 10 s later and then at most 120 s apart. In memory only; a Galaxy restart drops pending retries (shutdown logs them). See the debrief's stage 6 section.
- A SYSTEM_ERROR task's job info names the TES server's reason from its system logs (`System log: fork/exec /usr/bin/docker: argument list too long`) instead of Funnel's misleading "exited with code 0"; see the debrief's stage 6 section.
- Also stops attributing tesp-api's single whole-task executor log to "Executor 0 (pulsar-submit)". This also drops the executor name when Funnel or TESK fail at executor 0; see the debrief.
- Demo-only ports, not for a PR: `tes_task_polling_v26.1.2` at `1f7cae33d5f` (`a1b53d59234`, then the cancel retry `031b96fe16a`, then the SYSTEM_ERROR info) and `wes_tes_demo_fixes_v26.1.2` at `b317bc12545` (`3585089e925`, then `8b3166c80fb`, then the SYSTEM_ERROR info). `tes_native_staging_v26.1.2` stays stacked on `a1b53d59234`. The demo worktree `~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2` is detached at `8b3166c80fb` (cancel retry, not yet the SYSTEM_ERROR info); check out `b317bc12545` and restart Galaxy for both.
- Live check for the cancel retry: `scripts/tesp/acceptance/unreachable-cancel.sh` in `~/projects/repositories/galaxy-wes-tes` (demo commit `6f50454`), also the follow-up hook of `make acceptance`'s `unreachable` scenario.
- Documentation of the whole Galaxy WES → tesp-api line: the [wes_tesp_api project](../../../../../projects/wes_tesp_api/index.md).

## Review materials

- [Implementation](implementation_debrief.md)
