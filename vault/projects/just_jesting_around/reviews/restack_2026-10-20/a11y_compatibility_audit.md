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

## Mechanical merge preview and prepared candidates

A read-only three-way `git merge-file --stdout` preview used old Play base `81c498...`, the old two-commit accessibility tip `c246...`, and current Play worktree source. **All 13 changed story overlaps merge cleanly**: ListCollectionCreator, CommandPalette, FilesDialog, FormData, FormOptionalText, ChangePassword, ObjectStoreBadges, ScrollList, SelectionField, InstallationSettings, WorkflowInvocationState, QuotaForm and RoleForm. Thus the minimal strategy is a normal exact-boundary two-commit transplant, retaining automatic merges and auditing them, rather than preemptively replacing whole story files.

Prepared preview candidates live under `/private/tmp/dependents-20261020-a11y-candidates/clean/client/...`; `manifest.json` records each original path and candidate path. No conflict-marker candidates were needed. They combine the **current** Play source with only the original historical annotations; they do not add new exceptions or remove old ones. These candidates are optional recovery references, not replacements to copy blindly after Play changes again. The driver must pin the final published Play SHA and confirm its source matches this preview before relying on them.

No repository Git/index/source mutation or tests were performed by generating the preview. Package/lockfile merging is left to the driver's actual rebase so current dependency resolution remains authoritative.

## Final independent normal review — candidate b6d4c40d6c42

Static approval of `b6d4c40d6c42af7eb469bc7b920e69433eddee9c` **as a preserved accessibility prototype restack**, pending the driver's runtime gates. The branch is clean. Exactly **2 own commits** sit above final published Play `735da91611e343c370e5150d619691ad4407b112`, with that exact first-parent boundary. Both raw commit-body byte strings (including all trailers and terminal newlines) are identical to their original respective commits. Tree: `761be3416b121f9142f65c98bf459a4ae9a376ed`. The own changed-path set remains exactly the original **32 paths**; whitespace diff check passes.

Across all **26 annotation-bearing story files**, exported story names and ordering match the new Play base. An independent TypeScript AST inspection compared every `play`, `msw` and `handlers` property text to the new Play base: **zero mismatches**. Thus the annotation merges preserve current interaction assertions and request scenarios exactly, including newer controls and newly inherited exports.

Every annotation-bearing file has exactly the same number of `a11y.test: todo` entries as its historical accessibility counterpart: **121 total**, with no expanded allowlist. Global strict `test: error`, `context: body`, all six axe tags and viewport presets remain intact. The addon is registered and pinned at 10.6.1, matching current Storybook packages. Existing MSW setup, lifecycle and app handler composition survive. No normal-review code-preservation findings remain.

## Final scoped test challenge — pending driver execution

The static challenge verifies that the rebase did not gain its apparent success by dropping interaction code, altering handlers, introducing exceptions, relaxing global axe checks or losing commit metadata. All those checks pass independently. This does **not** turn retained historical TODO exceptions into fresh accessibility coverage: strict probes of likely repaired stories remain desirable follow-up, and the prototype/do-not-PR hold remains appropriate.

The driver owns frozen dependency installation, full current Storybook browser execution, types, static build and scoped style. Record their actual exit statuses and totals, including unhandled browser errors and strict failures. Any current failures must remain explicit; the historical failing baseline does not excuse new lost assertions, and the successful Play-only run does not establish accessibility success. This reviewer ran no application test suites and made no Galaxy source or Git mutations.

## Runtime evidence update and publication assessment

The driver reports validation on the unchanged reviewed tree `761be3416b121f9142f65c98bf459a4ae9a376ed`:

- Affected unit coverage passes: **9 files / 128 tests** (7 files / 119 tests plus 2 files / 9 tests).
- Full strict Storybook browser run: **100 files: 61 pass, 39 fail; 432 stories pass, 151 fail**. The persisted `a11y_browser_findings.json` classifies **149 axe failures** and **2 interaction/setup timeouts**, in XmlToolSource and FormData SelectsDatasetAndCollection.
- Typecheck has completed successfully (the command chain advanced to the build); static build and scoped style remain pending at this review update.
- Same-tree strict reruns of the two timed-out stories are pending. No source changes or new exceptions are planned.

These current totals replace the historical prototype counts for this candidate. They are **not a passing accessibility gate**. The 149 current strict axe failures are explicit prototype debt exposed on the expanded story set; they must remain visible, with no new `todo` annotations or reduced rule coverage. Successful affected-unit checks do not erase browser failures.

Independent publication assessment: publishing this clean, metadata-preserving rebase to its existing fork prototype branch is appropriate once build/style finish and the two interaction-timeout reruns are resolved or clearly classified. It does not promote the branch for integration or approve a PR. Its existing **prototype / do-not-PR / accessibility failures remain** hold must stay in the record and final user report. Use the captured exact old-head lease and verify the remote SHA. Do not label this branch green or imply those 149 axe findings were fixed. A confirmed new interaction/assertion regression would require a scoped integration repair before treating the restack as complete; a successful same-tree rerun needs no product-code change.

## Final publication approval

The driver's remaining gates now pass on the identical clean candidate `b6d4c40d6c42af7eb469bc7b920e69433eddee9c` / tree `761be3416b121f9142f65c98bf459a4ae9a376ed`: **typecheck, static Storybook build, full own-layer ESLint and Prettier**. Affected units remain **128 passing tests in 9 files**.

The two targeted strict reruns resolve the initial timeout classification without any source changes. **FormData SelectsDatasetAndCollection passes. XmlToolSource completes its interaction and reaches the strict axe gate, which fails on Monaco color contrast.** Thus no unresolved interaction regression remains from those two timeouts. The full browser run itself remains 432 passing / 151 failing; combining the diagnostic reruns identifies **150 stories with known strict axe failures**, while the remaining initially timed-out FormData story passes its same-tree recheck. These combined observations are not a fresh all-green full-browser run and must not be represented as one.

Independent final approval: publish the exact reviewed rebase to the existing fork branch using the captured explicit lease and verify the resulting remote SHA. All history/source preservation findings and scoped rebase-validation concerns are resolved. **Retain the prototype/do-not-PR hold for the 150 known strict accessibility failures.** No new accessibility exceptions, weakened assertions, product changes or expanded repair scope were introduced. The reviewer did not run application tests or mutate Galaxy source/Git state; runtime results above are driver-reported.
