# Accessibility prototype compatibility audit — 2026-10-20

Read-only review against current Play worktree at candidate `39fc28e8eef2f7d251212c744a20bc3b841240e5` plus its working-tree adaptations. This reviewer changed no Galaxy sources, refs, index or tests. Actual transplant and validation remain driver-owned.

Replay exactly the two own commits `81c4987360debdff86678e038e8035c31213a410..c246eb4fde308f62f817018b5ce5f41fbfba7407` onto the final **published** Play tip. The published Stories tip is now `fd5fd27f67aaa9d974b2d3cbc693ef8fa0a31864`; do not use it directly as the accessibility base or replay historical inherited Play commits.

## Configuration

Current Play `.storybook/preview.ts` and `main.ts` match the old accessibility layer's parent, so no special configuration candidate is needed. Apply the original strict addon changes while retaining MSW before/after checks, app plugins, router, body teleports and global styles. Package dependencies remain Storybook **10.6.1**, matching addon-a11y 10.6.1. The newer package/lockfile contains unrelated changes; merge only addon entries rather than replacing either file with the historical version. Preserve global `a11y.test: error`, body axe context, all WCAG/default/best-practice tags and viewport presets.

## Play behavior that must win annotation conflicts

- ListCollectionCreator now selects explicit `Select control`/`Select treated`/`Select rescued` buttons, rather than confusing these with nested dataset-view buttons. Preserve refreshed-list order/toast assertions.
- CommandPalette's empty search checks that “No results.” remains outside listbox/group markup. These are new structural assertions, not obsolete accessibility debt.
- FilesDialog retains the initial-source wait and the new NonRecursiveFileSource scenario. Do not let merging old exception parameters lose named MSW handler composition.
- FormData and FormOptionalText query the real `switch` role; restore none of the old checkbox-role expectations.
- ChangePassword now checks real input-label associations, exact field order and password input types. Do not reintroduce the obsolete “fieldset named, input unnamed” workaround.
- ObjectStoreBadges now uses buttons named by stock explanations, opens a named dialog on hover, and includes NonInteractive. Old tooltip-role expectations are obsolete.
- ScrollList scrolls the named `region` “datasets”; inner list semantics remain separate. Do not restore the former outer-list query.
- SelectionField finds its real named combobox input and inspects the wrapping group for selected-value text. Do not restore textbox queries or expect selected text inside the input itself.
- InstallationSettings keeps its new `Target Section:` label, `install-tool-section` id, and enclosing combobox assertion.
- RoleForm/QuotaForm use accessible names and enclosing picker groups. Their former ancestor traversal around an unnamed span is obsolete.
- WorkflowInvocationState preserves title-based disabled-tab notes, the three annotated nodes and body tooltip assertion; do not restore the historical aria-label lookup for those title hints.

## Historical exceptions to challenge with strict probes

The upstream `2abb4539572` accessibility repair and later changes fixed markup that the October 10 per-story TODO annotations describe. These annotations are historical observations, not evidence of current violations. Highest-priority strict probes (remove the per-story `test: todo` only in a diagnostic candidate or use an explicit strict override):

| Story family | Old annotation | Relevant new markup |
| --- | --- | --- |
| ChangePassword | `label` (3 stories) | Unique input ids with BFormGroup label-for; named-input plays now pass |
| FormOptionalText | `label` (2) | Generated input id and hidden label, real GCheckbox switch |
| ScrollList | `aria-required-children`, `button-name`, `scrollable-region-focusable` (7) | Focusable named outer region and real inner list; dataset controls fixed |
| ObjectStoreBadges | `aria-prohibited-attr` (2) | Real interactive buttons/dialogs and explicit noninteractive scenario |
| SelectionField | `aria-required-attr` (2) | Real combobox input and group from patched multiselect |
| FormSelection | `aria-required-attr`, some `tabindex`/`target-size` (7) | Generated ids and patched multiselect ARIA semantics |
| InstallationSettings | `button-name`, `label` (5) | Real target-section input label/id and current combobox |
| RoleForm / QuotaForm | labels, multiselect ARIA, contrast, tabindex | Associated labels and patched picker semantics; contrast can still remain |

Keep strict global checks. A passing Play browser run without addon-a11y does **not** establish that these TODOs may all be removed. Remove an old TODO only after its strict story probe passes; if other rules still fail, document their actual current findings rather than carrying a false historical rule list or silently broadening exclusions. No new blanket `todo`, `skip`, rule disables or reduced axe tag set is warranted by a base change.

A rebase need not implement every newly exposed product issue. Preserve the prototype/do-not-PR hold and honestly report any current strict-browser failures. Historical baseline already failed (260 passing, 68 failing on the first October 12 refresh; no fresh full run at the second-refresh c246 head), so neither original 236/236 nor the historical 121-exception count describes this candidate. Report new full-browser totals and distinguish assertion regressions, axe findings and environment errors.

## Scoped test challenge

Frozen install, types, affected-story style, static build and full Storybook browser execution cover the two-commit integration. Strict probes of the likely repaired families above resolve whether annotations are obsolete. Assert no loss of current Play export names, plays, MSW handlers or underlying unit assertions. Preserve exactly two commit messages/trailers after folding compatibility repairs. Do not claim a final green accessibility gate merely because all interaction plays pass under existing TODO exceptions.
