Independent review approves iteration15. Coverage, cleanup and the shared extended-history factory with three concrete consumers are accepted; no unresolved readability recommendation remains. Full tests, client types, lint and formatting pass.

<details>
<summary>Full review</summary>

# Independent normal review — iteration 15

Approved. No unresolved correctness or coverage-preservation findings.

Reviewed the iteration 15 changes relative to `b8933cdd60dac5572bc156c40a1464ab72e018a2`, including all ten selected suites, the shared test-data export, and its supporting API ownership-test consumer. Read `LOOP_ITERATION.md`, `PROBLEM_AND_GOAL.md`, the complete client unit-testing guidance, and the shared review focus. No production code changed.

## Original coverage comparison

| Selected suite | Before → after | Preservation checked independently |
| --- | --- | --- |
| InstalledList/Details | 1 → 1 | Original repository URL/name/owner service arguments; initial one loading stub/message and no details; completed loading absence, alert absence, and one detail child. Service arguments now asserted outside the mock. |
| FormElementLabel | 6 → 6 | Exact title/help, required/condition combinations, asterisk text, danger/required text, no requirement indicator, default slot. The former absent `span.text-danger` assertion now targets the actual `small` requirement markup, preserving and strengthening that contract. |
| FormCard | 1 → 1 | Original title, description, and string icon class. Shallow mounting keeps those parent-rendered elements. |
| SwitchToHistoryLink | 7 → 12 | Loading-to-name transition; active/current/purged/archived owned histories both with and without original filters; all tooltip strings; ordinary click followed by Ctrl-click with unchanged switch/filter counts and one extra tab; published other-owner history; inaccessible badge with absent loading/link. The duplicated unowned/no-filter execution becomes the intended with-filter case; no-filter coverage remains. Original IDs, names, flags and user fields retained; resolved URL and target added. |
| StateUpgradeModal | 5 → 5 | Empty/populated messages, original step/name/details, native close event, new-messages reopening and empty-messages remaining closed, sanitizer input/profile/anchor. String step indices match the declared type while retaining original numeric meaning; empty label/icon defaults retain absent-field presentation. |
| MarkdownGalaxy | 13 → 13 | Version and collapse prop transition/click; current UTC formatting; initial/loaded history link, import body and success/failure text; original invalid syntax/type/label inputs; missing invocation, conflicting labels, loading state, workflow fetch; explicit false-to-true table booleans and absent defaults. Failure now uses an explicit failed POST; collapse uses rendered heading. |
| ContentItem | 1 → 5 | HID/name/exact three ordered tags, each click payload, each removal exclusion, non-history empty-tag transition, expansion emission, selector absence-to-presence, square/check-square icons, true/false selection payloads, success/info classes. Expansion and selection explicitly recreate the same empty non-history item state that preceded those original actions. |
| SearchList/Repositories | 1 → 2 | Original query, shed URL, scrolling flag, two repository rows and ordered names; loading message; original empty-results message. Empty state now comes from the service response instead of assigning internal repositories/page state. |
| uploadState | 43 → 44 | All initial lists/counts/flags, item/batch association and order, lifecycle transitions, progress/bytes, terminal cancellation protections, dataset IDs/errors, mixed-state clearing/cancellation/resolution/dismissal remain. Independent uploading/processing progress scenarios split; factory defaults exactly match original fixtures, and custom contents retain explicit sizes 7/5/6. |
| HistoryCounter | 7 → 7 | Healthy/initial/lost SSE states and exact titles/button props; fresh/stale/unwatched polling; real-button reload event once. Original owner, zero counts, history flags and three-minute stale input retained. Fixed time replaces uncontrolled wall time. |

## Boundaries, isolation, and reuse

Fresh mounted Pinia instances are installed through existing `withPlugins`, and wrappers auto-unmount. Window spies, query mocks, sanitizer behavior, fake timers, and singleton upload state are reset. HistoryCounter clears its fake intervals and timeout before restoring real timers. Real tag/button/table/modal children remain where original contracts depend on their markup or clicks; unrelated children remain stubbed.

The new `getFakeHistorySummaryExtended` has two concrete selected consumers and one supporting API-test consumer. It composes the unchanged brief-summary factory, adds the generated interface's required owner/size/content counts, returns fresh nested counts, and applies overrides last. This repairs the initially detected brief-versus-extended type mismatch without casts or changing old factory consumers. Counter retains the original extra `create_time` fixture field separately. Existing upload factories replace identical local fixtures; no helper changes were needed there.

## Validation

The authoritative shuffled run (seed `150101`, `NODE_OPTIONS=--no-webstorage`) passes 110/110 cases across eleven files (96 selected cases and 14 supporting API cases), with no skipped, todo, or failed cases. Full client typechecking, scoped ESLint with zero warnings, and Prettier pass. Upload authors also ran the unchanged shared-fixture consumers: 30 additional passing cases across upload item types, batch operations, and submission. Higher-layer suites were inspected, not executed.

The final typed-factory change and the ContentItem state restoration were re-read before approval. The supporting `client/src/api/index.test.ts` migration changes only the local `historyWithOwner` construction: the original brief history defaults, owner IDs, override ID/URL, and all 14 assertions remain. Its missing-owner scenarios continue using the brief factory, keeping missing owner distinct from an explicit null owner. Only the ten selected suites count as originators. No new README principle or deferred shared abstraction is justified by this batch.

</details>
