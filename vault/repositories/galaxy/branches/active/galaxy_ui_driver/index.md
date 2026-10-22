# galaxy_ui_driver

Status: `branches_reference`.

Standing branch for Galaxy changes motivated by gxui.

[Tracking history](tracking_history.md)

Owned by the [Playwright project](../../../../../projects/playwright/GALAXY_UI_SKILL_DESIGN.md). Do not PR alone or polish. gxui stays the tip commit; Galaxy fixes go below it, one per commit. Restacking and force-with-lease pushes to jmchilton are a standing OK. The owning session handles the restack. Since 2026-10-09, commits are pulled out as their own PRs off dev, following [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Merged commits are then dropped from the stack.

**Base is `release_26.2`, not dev** (John, 2026-10-20). The branch drives release 26.2 QA, so its `navigation.yml` and helpers must match 26.2. Rebased onto `release_26.2` `65132d40dac` at `6c1b6093964`, 27 commits. #24142 is on 26.2, so its commit was dropped. #24139 merged to dev only, so its commit stays. Pre-rebase tip: `jmchilton/galaxy_ui_driver_backup_20261020` (`381f47837e3`). Restacks go onto `release_26.2` until John says otherwise. The final gxui PR still targets dev, so rebase onto dev before opening it. Upstreamed PRs still come off dev. FAQ-loop commits go below gxui (`c31fcb13a8e`, `4d391ac7e36`, `8d36a3bd9f3`, `12c8ec3d7c7`, `2782db29ee2`, `f19d8ec90f8`, `a67081d346c`, `d58f510c7c0`, `a51d2b9ed4a`, `93b1f03b432`, `e31b6908bec`, `7bea524600b`, `b96ef661d45`, `cdc5c200548`, `00c72c7fa3c`, `a9b34ac894c`, `1a9b0ccb3c2`); tip `abe4446f5bc`.

**Restacked 2026-10-21 onto [`workflow_editor_connection_helpers`](../workflow_editor_connection_helpers/index.md)** (`8380a8c1026`, on `release_26.2` `7febcc1d683`). That branch is off 26.2 on John's call. 42 commits; tip `fddc4bda08a`. Pre-restack tip: `jmchilton/galaxy_ui_driver_backup_20261021` (`abe4446f5bc`).
- **Dropped:** `8db334d5c50` and `046111eba20`, superseded by #24317, which merged to 26.2. The `_workflow_card_named` unit tests went with them; #24317 covers that lookup with E2E tests.
- **Kept, re-resolved:** `ffbdb7ee11e` (now `ec9ae950924`), the colon-free search, now on #24317's `_workflow_card_action`. Its "every title contains" check uses the search term, so another workflow matching only the term can't stall the wait.
- **gxui editor verbs:** `workflow-connect`, `-disconnect` and `-remove-step` call `workflow_editor_try_connect`, `workflow_editor_destroy_connection` and `workflow_editor_remove_node` when the step's `node-label` is unique. Otherwise they use their id-based code, because unlabelled steps of one tool share a label.
- **Since (FAQ loop):** `755d9376924` tests a dataset's Datatypes-tab change; gxui gains `dataset-change-datatype` and `dataset-change-dbkey`. 43 commits; tip `d982e460bb0`.

**Worktree (2026-10-20).** Another session put the standing worktree (`branch/galaxy_ui_driver`) on `custom_build_from_fasta`. `galaxy_ui_driver` is checked out in `branch/galaxy_ui_driver_gxui` (shares the standing worktree's `.venv` by symlink). Run `faq_server.sh` and `gxui` with `GALAXY_ROOT`/`GXUI_GALAXY_ROOT` set to it.
