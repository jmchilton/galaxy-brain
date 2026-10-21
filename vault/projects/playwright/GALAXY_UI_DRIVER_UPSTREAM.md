# galaxy_ui_driver upstreaming

Long-running task (John, 2026-10-09): break `galaxy_ui_driver` down and land its Galaxy fixes in
dev. Replaces the old "decide what to pull out at the end" rule.

## Rules

- Each PR comes off dev and holds one theme from the commits below the gxui tip.
- Prefer PRs that grow E2E coverage. A fix or abstraction lands with a Selenium/Playwright test
  that uses it, so the suite becomes its regression test and the PR has a non-gxui motivation.
- **`galaxy_ui_driver` sits on `release_26.2` for now** (John, 2026-10-20). It drives 26.2 QA,
  so its `navigation.yml` has to match the release. Once a PR merges, restack onto
  `release_26.2` and drop its commits if 26.2 has them. A dev-only merge keeps its commit, as
  #24139 does. gxui stays the tip.
- **The final gxui PR targets dev.** Rebase onto dev before opening it.
- Commits only gxui motivates (CDP port, storage state) go up with gxui. They don't get
  separate PRs.
- Branch records, PR descriptions and opening follow `vault/agents/gx_branches/`.

## Breakdown (John, 2026-10-09)

Easiest first. Commit numbers follow the queue in `GALAXY_UI_SKILL_DESIGN.md` ("Prerequisite
PRs").

**1. Two standalone fixes, in parallel.** Both merged: [#24142](https://github.com/galaxyproject/galaxy/pull/24142)
and [#24139](https://github.com/galaxyproject/galaxy/pull/24139). The 2026-10-20 rebase onto `release_26.2`
dropped #24142's commit. #24139's commit stays because it is on dev only.
[`tool_open_tool_shed_ids`](../../repositories/galaxy/branches/merged/tool_open_tool_shed_ids/index.md),
[`playwright_timeout_retry_once`](../../repositories/galaxy/branches/merged/playwright_timeout_retry_once/index.md).
- **Tool Shed ids in `tool_open`** (4a). A real tool panel bug: searching by a Tool Shed id finds
  nothing. The `tools_list` card selectors (invalid CSS for a Tool Shed id) were folded in on
  2026-10-11. Tested by vitest and by `integration_selenium` E2E tests that install a real Tool Shed
  tool, in the same way `test_workflow_repository_tool_update.py` already does.
- **Retry a Playwright timeout once** (7b). Its own PR because it changes timing for every
  caller of `retry_call_during_transitions`. A stuck Playwright action now fails after 2 action
  timeouts, not 12. The PR says upfront that it partly reverts `2825bb09e42` ("Try to fix transiently failing
  test?", 2026-03-22), which made Playwright timeouts retryable. That commit's CI run is gone and
  John isn't worried about the flake returning: the change justifies itself.

**2. Coverage PRs.** Implemented 2026-10-20 on `release_26.2`: John wants them in the release, framed
as missing tests (a bug). Each brings the fixes its test needs, tests green under both backends
and red without each fix. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Coverage added |
|---|---|---|
| [`workflow_editor_run_cancel`](../../repositories/galaxy/branches/active/workflow_editor_run_cancel/index.md) | 4b, 7h, 7j | run from the editor's Run activity, pick a non-default dataset in the simplified run form, cancel |
| [`workflow_open_exact_title`](../../repositories/galaxy/branches/active/workflow_open_exact_title/index.md) | 7c, 7g | open and run a workflow whose title prefixes a newer one's |
| [`workflow_editor_second_subworkflow`](../../repositories/galaxy/branches/active/workflow_editor_second_subworkflow/index.md) | 7d | insert two subworkflows from the editor's Workflows panel |

- **7i moved to step 4.** On 26.2 the list search opens `X: Y`, `X:Y` and `tag:Y` titles without
  it (dev's `filtering.ts` is the same); it only works around test.galaxyproject.org's older client.
- **Follow-up.** `workflow_run_setup_inputs` drops `type: File` inputs, so existing
  `workflow_run_specify_inputs` callers select nothing and pass on the form's preselected dataset.

**3. Area PRs.** Implemented 2026-10-20 on `dev` (enhancements, so not 26.2). New tests are
green under both backends and red without their change. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Tests |
|---|---|---|
| [`selenium_tool_form_helpers`](../../repositories/galaxy/branches/active/selenium_tool_form_helpers/index.md) | 6a, 6a′, 6b, 6c, 7a, 7e, 7f | new E2E: fill an editor step's form (7a), describe a rerun form (6c); `test_tool_form.py` 29/29 |
| [`selenium_multiview_copy`](../../repositories/galaxy/branches/active/selenium_multiview_copy/index.md) | 4c, 5e | 5e's copy E2E, red without 4c's hooks; Multiview file green |
| [`selenium_standalone_package`](../../repositories/galaxy/branches/active/selenium_standalone_package/index.md) | 5a, 5b, 5c, 5d, 7k, 7l, 7n + consumer | `GalaxySeleniumContext` includes `UsesUploadActivity`; new E2E uploads through a standalone context; upload/extraction spot checks |

- The consumer commit drops every test class's own `UsesUploadActivity` mixin (MRO), and 7k
  picked up dev's newer `test_workbook_mapping.py` import. gxui's `GxuiContext` can drop its mixin
  once this merges.
- These merge to dev only, so their commits stay on `galaxy_ui_driver` until it restacks onto a
  base that has them.

FAQ-loop commits ([HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md)) land below gxui too. So far:
- `c31fcb13a8e`: a docstring on `NavigatesGalaxy.register` (`inspect.getdoc` showed
  `ABC.register`'s). Fold it into the `galaxy.selenium` PR.
- `4d391ac7e36`: coverage for `account_create`. It adds `register(via_masthead=True)`, an
  `inactivity_box` component and `test_user_activation.py` (register, banner, resend, activate). A
  standalone coverage PR candidate, like step 2. It is green under Playwright only so far.
- `8d36a3bd9f3`: coverage for `activity_bar_how_to_enable`. `test_activity_bar.py` hides and shows
  an activity from the More panel; adds `activity_bar` components. Coverage PR candidate; green under
  Playwright only.
- `12c8ec3d7c7`: renames `preferences.activity` to `activity_bar.more`. It edits
  `upload_activity_helpers.py`, which `50ac1760a58` creates, so it goes with the `galaxy.selenium`
  PR, or with `8d36a3bd9f3` if that lands first, touching the older caller.
- `2782db29ee2`: coverage for `analysis_add_custom_build`. `test_custom_builds.py` makes a build
  from a history fasta; adds `custom_builds` components, and `len`/`linecount` plus the
  `fasta -> len -> linecount` converters to the framework datatypes. Coverage PR candidate. Green
  under Playwright only; `test_datatypes.py` API tests still pass.
- `f19d8ec90f8`: `tool_form_fill` switches a dataset field to collection mode for a collection hid
  and fails when the selection doesn't land (was a silent no-op). Test in `test_tool_form.py`, red
  without the fix. `tool_form_fill` came from 6a, so this goes with `selenium_tool_form_helpers`.
- `a67081d346c`: coverage for `analysis_jobs_not_running`. `test_user_activation.py` checks that an
  inactive user's upload fails with "Action requires account activation."; adds
  `upload_activity.progress_row_error(row)` and the `UsesUploadActivity` mixin on that class. Goes
  with `4d391ac7e36`.
- `ab809115f5e`: Cut1 (`cutWrapper.pl`) uses `chomp`, not `chop`, so a last line with no newline
  keeps its last character. A standalone fix for 26.2. No test: tool-test uploads always add the
  newline. Related queued issue: `upload_posix_lines_default_off.md`.

**4. gxui** with 2 (CDP port), 7m (storage state) and 7i (colon-free workflow search).

## Starting a PR

- Pick the commit off the current `galaxy_ui_driver` by subject; hashes change on every restack.
- Branch off a freshly fetched `origin/dev` and cherry-pick it there. Re-run its tests on the new
  base.
- Step 1 branches: `tool_open_tool_shed_ids` (4a, "Let tool_open find Tool Shed tools by id") and
  `playwright_timeout_retry_once` (7b, "Retry a Playwright timeout once during transitions, not
  ten times"). Neither needs an E2E run, so a per-branch worktree under `WORKTREES.md` is fine.
- Hand off per `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`: branch record, a
  `MY_BRANCHES.md` line, push to `jmchilton`. Note in the record that the commit comes from
  `galaxy_ui_driver` and gets dropped from it on merge.

## Open questions

- Is the standalone-selenium PR too big? 7k alone moves about 1,000 lines.
