# PR 24046 CI repair — 2026-10-11

## Diagnosis

The failures are related to the PR, but the observed failures are browser-driver incompatibilities with intentional accessibility markup changes. No application regression was established. The production component code is unchanged by this repair, and existing scenarios and assertions are preserved.

Before editing, the `fix_story_a11y` worktree was clean, its HEAD matched the live PR at `0d7e194649453a63c6f18f54feb8549ce4e6b4c3`, and it had no commits ahead of its upstream. The previous agent had recorded shard-1 diagnosis in [ci_triage_24046.md](ci_triage_24046.md), but had not implemented a repair. Other accessibility branches contain separate older component changes; the disposable audit worktree contains the documented production overlay and story-selector adaptations, not an unpushed PR-driver repair. A fresh fork fetch before publication still matched the original PR SHA.

The full failed logs were inspected for all three Playwright shards, Integration Selenium, and Tool form harness. Their respective results were 61/47/40 failed plus five setup errors across Playwright, 26 failed in integration, and 79 failed in the harness. Failures occur at these stale assumptions:

| Driver assumption | Rendered behavior and repair |
| --- | --- |
| History rename input has a fixed ID | Select the input within `name display`; keep unique per-instance production IDs. |
| A select field ID identifies its outer wrapper | Resolve a supplied multiselect input to its enclosing multiselect before finding its caret, search input, and options. Reuse this helper for workflow parameter type selection. |
| Combobox role and options live under the old form-field wrapper ID | Open workflow datatype selectors with their visible caret; search the labeled combobox input and scope options/selected values to the explicit `-container` wrapper. Adjust dataset datatype/dbkey wrappers too. |
| Tag removal is an `i` element | Target native removal buttons, retaining selected-user/role/group scoping. |
| Folder navigation is an anchor or nested label span | Target the FTP folder button and URI label on either file or folder. |
| Clicking the history table cell opens its datasets | Target the history's native open button; retain dataset row-selection behavior. |

The shard-0 CI DOM confirms `#pja__out_file1__ChangeDatatypeAction__newtype` is the actual combobox input, styled to zero width while closed, and its outer ID ends in `-container`. The library-import snapshot shows the dialog still displaying histories after the cell click, with a separate `button.selection-dialog-folder` for opening the history. The previous triage supplies rendered history-rename and tool-select evidence from shard 1.

## Validation

Built this PR's actual client with `SKIP_VIZ=1 npm_config_use_node_version=22.20.0 pnpm run build`, then used the existing Python 3.13 environment and embedded, isolated Galaxy test servers with Chromium/Playwright. No external user database was used.

- Nine existing application tests passed: history rename/save, Escape-cancel, rerun with a deleted dataset, workflow output datatype, conditional-step parameter type, library import from history, role editing, user role/group editing, and dataset datatype auto-detection.
- Three existing integration tests passed: quota user/group editing, multiple quota sources with job execution, and FTP history export/import (including folder navigation and file selection).
- Four opt-in tool-form harness cases passed: `gx_select[0]`, `gx_select_multiple[0]`, `multi_select[0]`, and `gx_conditional_select[1]`; actual browser tool execution and output assertions ran.
- Fifteen existing component tests passed across `ClickToEdit`, `SelectionDialog`, and `MultiselectAccessibility`.
- Changed Python files pass Ruff lint and the repository's Black formatter; navigation YAML passes Prettier; `git diff --check` passes. Ruff's alternative formatter reported pre-existing differences elsewhere in `navigates_galaxy.py`; Galaxy uses Black, so those unrelated lines were not changed.
- Required vault validation: 122 files, zero errors, 15 advisory warnings.

These focused runs demonstrate that the failing interactions work against this PR's client. They do not replace the full upstream CI rerun or manual assistive-technology testing. Full logs and downloaded artifacts remain under `/tmp/pr24046-*`; no artifacts or screenshots are committed.

## Publication

Committed and pushed `96bd157af90d51595b5d8f4195d13699bc72846e` to `jmchilton/fix_story_a11y` without rebase or force-push. Live PR verification confirms that head, OPEN draft status, and MERGEABLE state. Upstream CI is queued/running; [Playwright rerun](https://github.com/galaxyproject/galaxy/actions/runs/38178839984) covers the full browser suites. Queue status is `ci_wait`. Reassess the new runs before undrafting.
