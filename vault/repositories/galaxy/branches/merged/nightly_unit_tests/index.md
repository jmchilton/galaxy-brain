# nightly_unit_tests

Status: `merged` (refreshed 2026-10-16).

Rebalances dev PR CI: unit and Tool Shed tests run on Python3.14, tool framework tests use the tool request API, and the performance workflow, unused suite and exclusive helpers are removed. Dev nightlies cover Python3.10–3.14 for unit/Tool Shed and both framework APIs. Release PR matrices stay intact.

[Alternative rejected by John for verbosity](../../active/nightly_release_targets_alternative/index.md) · [Rollback debrief](release_nightlies_rejection.md) · [Original description backup](pr_description_before_release_nightlies.md)

[Draft-opening debrief](draft_opened_2026-10-14.md) · [PR description](pr_description.md) · [Title choices](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Polish checklist](polish_checklist.md) · [Description strengthening](polish_strengthening.md)

[Implementation debrief](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Rename review](subagents/rename_review.md) · [Tool Shed review](subagents/toolshed_review.md) · [Tool framework + performance review](subagents/framework_tools_review.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md) · [Reporter harness](report_harness.mjs)

## Origin — 2026-10-14

From a chat with Marius about CI speed: drop one per-PR unit Python version (about 30 min) and run every version nightly with tracking issues, as the weekly Selenium run does ([#24014](https://github.com/galaxyproject/galaxy/pull/24014)).

## Decisions

- **Keep 3.14 per-PR, not 3.10** (John, 2026-10-14). 3.10 is the slower job (about 30 min vs about 22), so this shortens PR wall-clock time. Too-new code is caught statically on 3.10: ruff 0.17.0 flags too-new syntax, and mypy on 3.10 in the lint matrix flags too-new stdlib attributes (both checked with probe files). Gap: a whole new stdlib module (`import tomllib`) passes mypy because of `ignore_missing_imports = True`. The 3.10 runtime suites (API/integration/etc.) and the nightly cover it.
- Release PRs retain 3.10 + 3.14 (`f18cff94279`), because the active proposal schedules nightlies only for dev. The cross-release extension was rejected for verbosity and preserved as an alternative. `758d072b3da` briefly ran all five versions there; reverted to avoid a 10-job Tool Shed matrix per release PR.
- First upstream PR run: confirm "Unit tests" on the fork PR doesn't hit `startup_failure`; see the [normal review](subagents/normal_review.md) #2.
- Reporter extracted into a reusable workflow. This is the second consumer the #24014 debrief named as the trigger.

## Changes — 2026-10-14

- John: prefix reusable workflows with `_`, including `build_client.yaml` (`d449d938617`, `a97ecd968ad`).
- John: apply the same split to the Tool Shed tests (`7d8dad4d980`). Review fixes are in `f18cff94279`.
- John: drop the performance workflow (`ff639dd464b`). Tool framework: keep `never` (tool request API) per-PR, and move `always` (legacy API) to a daily run (`e0573f6bf2a`, review fixes in `694f69c4eab`).

## Polish — 2026-10-14

Final head `b2a792c206ded6040be900adef9b4b52f3819719` is pushed. No rebase was needed against current dev. Fixed three inaccurate nightly issue descriptions, completed the independent checklist and one strengthening round, and prepared the description/four titles. Human read-through remains unchecked. Final-head zizmor is green; unit, Tool Shed and framework CI remain in progress with no reported failures. See the [polish debrief](polish_debrief.md) for evidence and remaining upstream verification. No PR opened; approval remains unassigned.

## Release nightly extension — 2026-10-14

John requested release26.0/26.1/26.2 plus dev, one nightly Python per branch, and selected3.10 for all four. Implemented in one reversible commit `a13b016c0ff` on top of `b2a792c206d`; pushed to the fork. Nightly infrastructure runs from dev without release backports. Existing release PR checks retain their matrices; no release policy backport was made. Independent final checklist and one rewrite strengthening round passed. The description and four titles are rewritten; the backup preserves John's prior human-read mark. Final-head security CI is green; remaining runtime/preparation CI is queued or running. New tests/comments require a fresh human read. No approval SHA is assigned and no PR was opened.

## Alternative rejected — 2026-10-14

John rejected the cross-release implementation as unreadable/too verbose and asked that it be kept separately for Marius to assess. Preserved `a13b016c0ff` on `jmchilton/nightly_release_targets_alternative`, then reverted it on this branch in `2ac1e9cc820`. The restored tree exactly matches `b2a792c206d`. Restored the pre-extension description and title options, adding an explicit link to the rejected alternative. The alternative's snapshots retain John's latest edits. No PR, issue or GitHub comment was posted. Status remains branches_ready_for_final_review; no approval SHA is assigned.

## Draft PR opened — 2026-10-14

John explicitly requested a draft PR. Opened [#24131](https://github.com/galaxyproject/galaxy/pull/24131) against dev with title **Move older-Python and legacy tool API CI to tracked nightly runs**, using pr_description.md verbatim. No mentions, reviewer assignments or comments were added.

A conflict-free rebase onto current dev `b62d06dcdce` produced head `321f8b4c0f288a17c3861602e92e635ea76d8844`; the branch diff is byte-for-byte identical before/after. The fork was updated with force-with-lease. The rejected cross-release alternative remains unchanged on its separate fork branch.

Live state: draft, mergeable, CI queued/in progress. Expected unit3.14, both Tool Shed3.14 clients and framework3.10/never jobs are present; no startup_failure observed. Full runtime results remain pending. The reporter harness passes all seven cases.

Standing instruction: this is an explicitly requested draft for discussion, including Marius's assessment of the rejected alternative. Keep it draft until John requests promotion; there is no non-draft approval pinned to this SHA.

## Reusable client build references — 2026-10-14

John asked about missed build_client references on #24131. All filenames had already been renamed, but five callers still used `./.github/workflows/_build_client.yaml`. The PR's zizmor annotations requested GitHub's `$/...` self-repository syntax. Updated first_startup, integration_selenium, osx_startup, playwright and tool_form_harness in [a311e41f2c3](https://github.com/jmchilton/galaxy/commit/a311e41f2c312706293b722490e5b8f72669d239), pushed to the existing draft. Selenium already used that syntax.

Verification: all six callers now use `$/...`; a tracked-file search finds no old build_client.yaml filename in workflows/docs. GitHub workflow schema and configured zizmor checks pass on the five changed workflows; commit-hook workflow validation passes. No tests/comments or PR description changed. Live PR head matches the fix and remains draft; fresh CI is queued/running, so status remains ci_wait. The explicit draft hold remains in effect.

## Review fixes — 2026-10-15

John asked to address the issues in Marius's review. Pushed `191c67516c7526646df142545ab3941295570302` to the existing PR branch. Live PR is non-draft (already promoted before this task), mergeable against dev; no rebase was needed. New CI is queued/in progress. The prior head's unit, both Tool Shed, framework and other executed checks passed.

- Followed John's earlier decision to remove performance CI and Marius's alternative of removing the orphaned suite: deleted `lib/galaxy_test/performance/`, its generated API documentation/toctree entry, `--ci_test_metrics`, and the exclusive scaling/link helpers in `WorkflowPopulator`. A tracked-file search finds no remaining references. The typo disappears with the unused suite. No runtime metrics implementation was removed.
- Moved the three new daily schedules to 00:17 / 01:17 / 02:17 UTC. The existing Tuesday extended-metadata schedule and its gates stay intact.
- Unit and framework Codecov uploads now skip schedule and workflow_dispatch events.
- Clarified in developer docs and the description that reporter path filters load its definition and execute caller test jobs, without testing issue reporting. No historical commit messages were rewritten.
- Queried upstream dev protection: required_status_checks endpoint returns 404 "Required status checks not enabled"; active branch rules endpoint returns `[]`. No named required check needs updating based on current GitHub state.

Validation: all seven reporter harness cases pass; workflow schema validation and configured offline zizmor pass for all three edited workflows; Ruff and Python syntax pass for populators; `bash -n run_tests.sh` and diff whitespace checks pass. Commit hooks pass except shell-lint's 12 pre-existing ShellCheck findings, confirmed identical by code/column/message against the pre-change script; skipped only that hook for the commit. Full runtime suites are left to the new CI run.

Updated the PR description for schedules, suite removal, Codecov policy, reporter validation limits and prior startup evidence. Reset the human-read checkbox because comments changed. No GitHub review reply or comment was posted. These changes have no pinned approval; a fresh human read remains required. Upstream scheduled/manual reporting still needs end-to-end verification after merge.

## Morning refresh — 2026-10-16

GitHub confirms [#24131](https://github.com/galaxyproject/galaxy/pull/24131) merged at 2026-10-16T08:02:39Z, head `a0ec8cc0d927b9119a6f908e6424b8a72e93ed2a`. Removed from the active queue and archived this record under `merged/`. Worktree retained: local HEAD differs from the merged PR history; upstream/history needs review before removal.
