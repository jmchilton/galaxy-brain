# Lane cascade onto latest dev — 2026-10-13

John asked for a clean rebase of the whole stack before the story and play loops continue: `fix_story_a11y` → `vitest_readability` → `vitest_stories` → `vitest_story_play`, each on the one below, starting from current dev.

## Why it was messy

`fix_story_a11y` sat on dev `6831f768a63`; readability sat on dev `9ac3cd2eb30`, 29 commits later. The 2026-10-13 `--rebase-merges` rebase of readability onto a11y replayed those 29 dev commits (12 merges, e.g. `#24060`) as rewritten copies between a11y and the 493 readability commits. Stories and play still sat on the old readability `510a2d39a92`.

## What was done

Backups: `backup/<branch>-pre-dev-rebase-20261013` for all four branches.

| Branch | Old head | New head | Base |
| --- | --- | --- | --- |
| `fix_story_a11y` | `175e7d5a183` | `cfb0e376ba3` | dev `63192fd64e4` |
| `vitest_readability` | `3d593f929a9` | `7f2db5e5941` | `cfb0e376ba3` |
| `vitest_stories` | `20c515a9661` | `1c13e48dc19` | `7f2db5e5941` |
| `vitest_story_play` | `8f8725d5bf4` | `b9d034bf9f1` | `05f4ef17c79` (stories after its first new iteration) |

Each push used `--force-with-lease=<branch>:<old head>`.

- **a11y:** clean; range-diff identical apart from one `navigation.yml` context line (`parameter_number_list_input` → `parameter_value_list_input` upstream). 23 affected files / 196 tests and type-check pass.
- **readability:** `rebase --onto cfb0e376ba3 f50485624af`, dropping the 29 dev copies; 491 commits, no merges.
- **stories:** `rebase --onto` the new readability from `510a2d39a92`; 108 commits.
- **play:** `rebase --onto` the new stories from `543dfc46451`; 67 commits.

## Conflict resolutions

Readability, against dev changes:
- FormElement: upstream FormValueList, float and text cases, written with the lane's `mountElement`.
- HeadlessMultiselect: kept upstream `nextAnimationFrame` and its combobox/Tab/in-flow cases; added the `nextTick` import.
- JobElements: upstream's popover-structure and keyboard cases, in the lane's auto-unmount/`toolDetailsButton` style.
- UserSharing: upstream's GSelect permission case, through the lane's real Ok button and a `PERMISSION_OPTION_SELECT` selector.
- JobInformation: upstream's per-field message check folded into the lane's numbered-message case.
- TrsTool: upstream's version-select case on the lane's `registryTool` fixture.
- GCheckbox: upstream's rewritten suite with the lane's auto-unmount and typed `get()`; dropped the now-redundant manual unmount.
- SelectionOperations: upstream's stubs/attachTo options on the lane's `withPlugins` mount.
- Dropped `Improve readability of FormNumberList tests` (upstream deleted the component for FormValueList) and `Own collection progress wrappers…` (upstream deleted the duplicate `.test.js`).
- ZoomControl: a11y changed the reset button's name to `"<n>% zoom. Reset Zoom Level"`; the readability test still expected the old label (latent on the previous tip too). Fixed in its originating commit.

Stories, against a11y assertions:
- InstallationSettings, WorkflowInvocationState, ListCollectionCreator: textual conflicts; a11y checks kept, ported onto stories.
- QuotaForm, RoleForm, ChangePassword, ScrollList, FormOptionalText, ToolCard: a11y cases auto-merged but referenced pre-story helpers; ported onto `NewQuota`, `NewRole`, `PasswordExpired`, `GivenItems`, `WithValue` and `LatestVersion` and folded into each test's story commit.
- FormSelect: a11y makes FormSelection pass its own id, so the default-id case mounts FormSelect directly again, as upstream does.
- Dropped the FormNumberList story commit.

Play:
- InstallationSettings (test deleted by play): target-section label/list checks became a `WithToolPanel` play step.
- CommandPalette: empty-state checks (outside the listbox, no group) became steps of `SearchesScopeFromScratch`.
- WorkflowInvocationState, ToolCard, RoleForm, FormOptionalText, ChangePassword: a11y cases stay in vitest beside the plays.
- Dropped the FormNumberList plays commit.
- 27 plays in 9 stories files then failed in the browser: a11y's markup changed what they queried. A repair subagent adapted every one in its owning play commit, with no production changes:
  - QuotaForm, RoleForm, DatasetCopy, SelectionField: the combobox role moved to the input inside a role=group picker, and labels now point at their controls.
  - ChangePassword: real `<label for>`s.
  - ScrollList: the scroll region is named.
  - ListCollectionCreator: "Select <name>" buttons.
  - Node, WorkflowInvocationState: vGTooltip no longer overrides explicit names.
  - Most rewrites strengthen the checks. Each new check was shown to fail under a simulated break; an independent review found nothing weakened.

All 98 a11y-added `expect` lines survive verbatim in stories; in play the five that moved are the ported ones above.

## Validation

- readability: full unit suite 586 files pass except ZoomControl (then fixed, 7/7); type-check, eslint and prettier on resolved files pass.
- stories: type-check; unit 586 files / 5231 tests; browser 65 files / 260 tests; eslint/prettier on changed tests and stories.
- play: after the repair and on stories `05f4ef17c79`: type-check; unit 582 files / 5079 tests; browser 67 files / 419 tests. Pushed `b9d034bf9f1` with lease on `8f8725d5bf4`. Then moved onto stories `1d8c99cd058`, which only adds HistoryPageList's stories and test (its browser files pass), and pushed `c4941bce373`.

## Possibly obsolete BUGS_FOUND rows

The play repair dropped the plays' tolerance for three accessibility bugs that `fix_story_a11y` now fixes. These are the FormElementLabel title that isn't a label, ChangePassword's missing `label-for`, and vGTooltip replacing a button's accessible name. John to confirm and mark them. `WorkflowAnnotation.stories.ts` comments at lines 75 and 131 may be stale for the same reason.

## Ledger

No ledger edits. Entries for `FormNumberList.test.ts` and `CollectionProgress.test.js` now name files that no longer exist. Thirteen new upstream/a11y test files have no entry yet (GSelect, GCheckboxGroup, looseEqual, GHeading, ClickToEdit, ListDatasetCollectionElementView, TagsSelectionDialog, FormValueList, MultiselectAccessibility, Graph/ZoomControl, HistoryCard, ProgressBar, ToolDetailsButton); registering them belongs to the readability loop.

Not touched: `vitest_story_a11y` (on an older play tip, `b33b405804`) and `vitest_real_api_calls` (on the original readability base `df3932ed4b`).
