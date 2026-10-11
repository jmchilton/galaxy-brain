# zizmor_self_repository

Status: `abandoned`. Base: `dev`. Tip `10ed99e36b46e3bb2e52acb1937635fbbafcaaf1`. [PR #24016](https://github.com/galaxyproject/galaxy/pull/24016) (closed, unmerged on 2026-10-10).

Switches in-repo `uses:` references to GitHub's self-repository syntax (`$/...`), which fixes zizmor's `self-repository` code-scanning alerts on `dev`.

John asked for this on 2026-10-09 as a follow-up to [selenium_scheduled_ci](../../merged/selenium_scheduled_ci/index.md) (#24014). In that PR, the bot flagged the new `selenium.yaml`, which was fixed in place.

## Change

There are 7 sites: zizmor 1.30.1 (`--offline .github/`) found 7 findings on `dev` `67b0ff005b8` and finds 0 after the change.
- `build_client.yaml` reusable workflow: `first_startup`, `playwright`, `integration_selenium`, `osx_startup`, `tool_form_harness`.
- `install_apptainer` composite action: `integration`, `mulled`. These used `'./galaxy root/.github/actions/install_apptainer'` through the checkout path. `$/` loads the action from the repository at the workflow's commit instead of the workspace. The action is self-contained (it uses no `github.action_path` or checkout files), so its behaviour is unchanged.

The pre-commit "Validate GitHub Workflows" check passes.

## Evidence outstanding at abandonment

Fork CI has to show that `$/` resolves on Galaxy's runners: Playwright, first/macOS startup and Integration Selenium for the reusable workflow, and Integration/mulled for the composite action. If the fork doesn't run integration/mulled, those two sites are covered only by the upstream PR's CI.

`ghwt` created the branch off a stale base, so it was reset to `origin/dev` before committing.

## Abandoned — 2026-10-11

John explicitly abandoned this branch: "I've closed out that work." Live GitHub metadata confirmed PR #24016 was already closed at `2026-10-10T22:56:57Z`, with no merge. Removed the entry from the active queue; do not reopen or continue this work.

Removed the local worktree with `ghwt rm galaxy zizmor_self_repository` after verifying a clean status, zero commits ahead of `jmchilton/zizmor_self_repository`, and the exact tip above on the live fork branch. The fork branch remains available. `ghwt` archived its workspace note to `/Users/jxc755/projects/old/galaxy-branch-zizmor_self_repository.md`.
