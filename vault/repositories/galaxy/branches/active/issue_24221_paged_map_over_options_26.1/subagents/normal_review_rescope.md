# Normal review — after re-scope

No blockers. Acted on M1, L1, L2, L4 (folded into `e625fd88f5d`): the suffix names the unit with the existing `collectionTypeToText` ("one job per dataset pair"), `handleIncoming` keeps the server-listed option (`foundOption ?? newValue`), the drag-enter "already selected" check goes through `findExistingOption`, and `normalizeOption` keep labels get the suffix. One label test now covers `single_datasets` and `paired`.

Not acted on:
- L3 `createValue` dedupes by full key; dev later went back to id+src — no 26.1 collection variant allows multiple, so unreachable.
- Client search matches the suffix text — accepted trade-off of a text suffix on 26.1 (no `label-area` slot); PR note.
- Server-seeded values resolve to the direct entry (`/build` doesn't echo `map_over_type`) — #24219 family.

<details><summary>Full review</summary>

# Normal review (re-scope): issue_24221_paged_map_over_options_26.1

Reviewed `dbe4f2f7e41..f6d63350cbd`, mostly `f6d63350cbd`. Compared it with dev `9eff87c8e21`, `05907884de9` and `68b8d3969e5` (issue_20657_input_processing_mode), and with the sibling #24220 branch (`issue_24220_drop_collection_matching_26.0`).

Verification: vitest `src/components/Form/Elements src/components/Tool/ToolForm src/components/Workflow/Run` gives 25 files and 114 tests, all passing (node 22.20.0). eslint on the changed files shows 0 errors and 2 `any` warnings in FormData.test.ts that were already there. I did not red-check the new FormData tests against `7a3efdbea0e` (I left the worktree untouched).

No blockers. The expansion follows dev's selection-identity slice closely. `findDataOption`, `isSameItem` and `itemUniqueKey` are line-identical to dev `9eff87c8e21`, and the `currentValue`, keep-replace, `createValue`, `handleIncoming`, `normalizeOption` and `matchedValues` call sites all match dev.

## Findings

### M1. Map-over suffix shows raw collection types; the existing label helper isn't reused (Medium, UX/reuse)
`FormData.vue:458-465` `mapOverSuffix` renders `map_over_type` verbatim, giving "(one job per paired)" and "(one job per list:paired)". FormData.vue on 26.1 already has `collectionTypeToText()` (`FormData.vue:1094`, backed by `COLLECTION_TYPE_TO_LABEL`), and the no-options warning uses it. That helper gives "dataset pair" and "list of pairs". Dev's `mapOverUnit` does the same mapping (`collectionTypeLabel(...) ?? "nested X"`).
- Scenario: a tool accepts `paired,list:paired` and the history has a `list:paired`. The row reads "5: reads (one job per paired)".
- Fix: `const unit = option.map_over_type === "single_datasets" ? "dataset" : collectionTypeToText(option.map_over_type);`. Function declarations hoist, so the helper's position doesn't matter. Add one label case (`paired` → "dataset pair") to FormData.test.ts.

### L1. `handleIncoming` pushes the client-built value, not the server-listed option (Low, divergence from dev 9eff87c8e21)
`FormData.vue:544-545`: dev changed this to `incomingValues.push(foundOption ?? newValue)` ("dropped collections take the server-listed entry"). The branch keeps `push(newValue)`.
- Scenario on 26.1 without #24220: an input accepts `paired,list:paired` and the user drops a `list:list:paired`. Client `toDataOption` takes the first `endsWith` match, `paired`, while the server lists the deepest, `list:paired`. `findExistingOption` falls back to the server's row, so the select shows "(one job per list:paired)". The emitted value is `map_over_type: "paired"`, so the job fans out per pair. Before this branch the submission was just as wrong, but the label didn't say otherwise. Now the label visibly contradicts what gets submitted, until the next options change re-emits from `currentValue`.
- #24220 (26.0, `matchCollectionType`, deepest-first) removes the mismatch once it merges forward. Severity is low, but the one-line dev change is cheap protection and belongs to the identity slice, not the drop picker.
- Fix: `incomingValues.push(foundOption ?? newValue);` (as in dev). Add a test: drop an item the server lists only mapped over, and check that the emitted value equals the server's entry.

### L2. `onDragEnter` "already selected" check uses the client-built option (Low, divergence)
`FormData.vue:991-992`: dev wraps it as `containsDataOption(currentValue, option && (findExistingOption(option) ?? option))`. The branch passes the raw `toDataOption` result. Because `itemUniqueKey` now includes `map_over_type`, a mismatched client and server map-over type (the L1 case) no longer triggers "already selected", although it did before this branch. Dragging the direct form of an item whose map-over row is selected also stops warning, which is arguably right and matches dev. Fix together with L1 if L1 is taken.

### L3. `createValue` dedup is per option; dev ended up per item (Low/nit, divergence from dev 68b8d3969e5)
`FormData.vue:407-410` dedups by `itemUniqueKey`, which is dev `9eff87c8e21`. Dev later went back to id+src (`68b8d3969e5`, "Submit each item once, even if it was picked both directly and mapped over"). On 26.1 this can't be reached: every `data_collection` variant is `multiple: false` (variants.ts), and data inputs list each HDCA once. Either keep it, with a note that it's unreachable, or use dev's final rule so the two branches agree and a later forward port has nothing to reconcile. I prefer dev's rule.

### L4. Keep option from `normalizeOption` has no suffix (Low/nit, consistency)
`FormData.vue:640-643` builds the keep label without `mapOverSuffix`. `handleIncoming` (`:538`) and `formattedOptions` (`:227`) add it. Uploaded options rarely carry `map_over_type`, but all three keep-option label builders should agree. Calling `mapOverSuffix(option)` there, or pulling out a tiny `optionLabel(option)` used by all three, removes the drift.

### N1. The suffix becomes search text (note)
FormSelect filters on `label` on the client, so typing "list" or "job" now matches every map-over row whose name doesn't contain it. Dev avoided this with a `label-area` slot. 26.1 has no slot, so the trade-off is accepted (scope_evaluation says so). Mention it in the PR.

### N2. Server-seeded values resolve to the direct entry (note, known)
The `/build` value carries no `map_over_type`, so first load, rerun and `replaceParams` resolve to the direct row. Client-side selection survives rebuilds: `value` is in `CLIENT_OWNED_FIELDS` (useFormState.ts:68), so `syncServerAttributes` doesn't overwrite it, and the `[props.options, …]` watcher re-emits from `currentValue`, which keeps the exact-key match. If a rebuild drops the selected map-over row (an off-page HDCA, since 26.1 doesn't pin collections), `findDataOption` falls back to the direct row or the first option, and the watcher re-emits that. The job meaning changes silently. Direct selections have the same off-page problem, and it's tracked in the #24219 family. Note only.

### N3. Merge-forward with #24220 (note)
#24220 rewrites `toDataOption`'s map-over block and `canAcceptSrc`. This branch inserts `findExistingOption` right after `toDataOption` and edits `handleIncoming` just above it. Hunks are adjacent, so expect at most a trivial context conflict. Neither branch's logic depends on the other's.

## Domain checks (no issue found)
- **itemUniqueKey consumers (whole client/src).** The only users are FormData.vue, FormSelect.vue (`selectedKeys`, `currentValue` getter, `getSelectOption` key, `isSelected`) and types.ts. HistoryPanel.vue has its own local `itemUniqueKey`. The FormSelect sites now separate the two rows, which is the point. `data-option-value` and `data-selected-value` change to `hdca-<id>-<type>` only for map-over rows. Selenium/Playwright only uses those attributes for the PJA datatype select (navigation.yml:1121-1123).
- **containsDataOption.** Used at `handleIncoming` multi and single, `updateCurrentValue` (dataset-multiple only) and `onDragEnter`. Only L2 differs from dev.
- **keepOptions cache key** changed from `${id}_${src}` to `${src}-${id}[-${mot}]`. Every write and read (`isInKeepOptions`, the keep-replace loop) goes through `itemUniqueKey`, and nothing else reads keys by format. Side effect: pinned keep entries for the direct and map-over form of one HDCA no longer overwrite each other, which is a fix.
- **Remaining id/src-only matches.** `useWorkflowRunGraph.ts:143` (step description label, item-level, fine), `WorkflowRunFormSimple.vue:257` (expected-vs-actual item check, item-level, fine) and FormDataContextButtons (no matching). None needs map-over identity.
- **Selenium label selection.** `select_set_value` types the text and presses Enter, which picks the first match. The server emits the direct row first and `formattedOptions` keeps that order, so typed prefixes (`"{hid}: "` in `workflow_run_specify_inputs`, `"list:list"` in test_tool_form `identifier_multiple`, a `data` input with no suffix) still pick the same row. The exact-match click branch only runs when there is no search input. No test asserts an HDCA label on a `data_collection` input that accepts several collection types.
- **Suffix rule.** Only `props.type === "data_collection"` gets it, since a collection on a data input always maps over and needs no marker. `single_datasets` reads as "dataset" (from the server's `paired_or_unpaired` remap in basic.py:3054-3058). That's sensible apart from M1's wording.
- **Backport minimalism.** No badge, hint, slot, drop picker or deepest-type sort was added; `pageMergeKey` was deleted. Good.
- **Tests.** The FormData.test.ts cases are mount-level and check the select-and-reselect round trip. Good. The four `findDataOption` unit cases in types.test.ts are thin but cheap; the FormData mount tests already cover the exact-key and fallback paths. Optional trim.
- **Earlier commits** (server `accumulate_with_filter`, `mergeDataOptions` in ToolForm/WorkflowRunDefaultStep) haven't changed since the previous three reviews, and I have nothing new on them.

</details>
