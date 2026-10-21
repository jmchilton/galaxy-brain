# galaxy_ui_driver

Status: `branches_reference`.

Standing branch for Galaxy changes motivated by gxui.

[Tracking history](tracking_history.md)

Owned by the [Playwright project](../../../../../projects/playwright/GALAXY_UI_SKILL_DESIGN.md). Do not PR alone or polish. gxui stays the tip commit; Galaxy fixes go below it, one per commit. Restacking and force-with-lease pushes to jmchilton are a standing OK. The owning session handles the restack. Since 2026-10-09, commits are pulled out as their own PRs off dev, following [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Merged commits are then dropped from the stack.

**Base is `release_26.2`, not dev** (John, 2026-10-20). The branch drives release 26.2 QA, so its `navigation.yml` and helpers must match 26.2. Rebased onto `release_26.2` `65132d40dac` at `6c1b6093964`, 27 commits. #24142 is on 26.2, so its commit was dropped. #24139 merged to dev only, so its commit stays. Pre-rebase tip: `jmchilton/galaxy_ui_driver_backup_20261020` (`381f47837e3`). Restacks go onto `release_26.2` until John says otherwise. The final gxui PR still targets dev, so rebase onto dev before opening it. Upstreamed PRs still come off dev. FAQ-loop commits go below gxui (`c31fcb13a8e`, `4d391ac7e36`, `8d36a3bd9f3`, `12c8ec3d7c7`, `2782db29ee2`, `f19d8ec90f8`, `a67081d346c`, `d58f510c7c0`, `a51d2b9ed4a`, `93b1f03b432`, `e31b6908bec`, `7bea524600b`, `311918724d0`, `1b6127bb565`); tip `a6843763b71`.

**Worktree (2026-10-20).** Another session put the standing worktree (`branch/galaxy_ui_driver`) on `custom_build_from_fasta`. `galaxy_ui_driver` is checked out in `branch/galaxy_ui_driver_gxui` (shares the standing worktree's `.venv` by symlink). Run `faq_server.sh` and `gxui` with `GALAXY_ROOT`/`GXUI_GALAXY_ROOT` set to it.
