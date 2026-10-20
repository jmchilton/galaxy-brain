# Scope evaluation — issue_19234_batch_mode_hint_25.1

**Recommendation: expand (modestly).** Keep the branch's selection-driven map-over hint, and have the hint name the job unit: "...mapped over this tool, one job per `paired` collection" (`map_over_type`), or "one job per dataset" for `single_datasets`. That's about 10 lines in `FormData.vue` plus 2 jest cases. #19234 asks for "some clue to understand how the input will be processed", and the generic "mapped over" line only partly answers it. Plan and review dropped the unit text as "not trivial" because of `single_datasets`, but it's a one-branch special case. Don't pull in anything else. The joint-processing ("bulk") hint, dropdown markers, help terms and `FormDataProcessingHint` stay on the dev branch `issue_20657_input_processing_mode`. Drop matching, `canMapOver` parity, paging and off-page pinning are already queued in `gx_issues/to_file/`, and none of them is needed to fix #19234.

Branch: `origin/release_25.1` `8bb256be5b1` → `ad7c3fcc447`. Diff: `FormData.vue` +20/-6, `variants.ts` +7, `FormData.test.js` +150/-2 (4 commits: baseline tests, `isBatchSelection` refactor, fix, drop test).

## Possible Decompositions

About 30 non-test lines and about 150 test lines. The branch is above the 100-line mark only because of tests.

1. **One PR (as is).** Baseline tests → `isBatchSelection` refactor → fix → drop test. The natural unit.
2. **Two PRs.** (a) Baseline tests + `isBatchSelection` refactor, with no behavior change and the same `variants.ts` hunk as dev. (b) The fix + drop test, plus the unit text if the expansion is taken. Order: (a) then (b). Splitting this adds review overhead for little gain, but (a) could land on 25.1 in any case.
3. **Baseline tests alone**, per the "Baseline tests" convention: the `9b6f39b7609` pin as its own PR, then 1. or 2.(b).

## Scopes considered

### 1. As implemented: selection-driven map-over hint

Shows the existing "The supplied input will be *mapped over* this tool." line whenever the selected value carries `map_over_type`, e.g. `list:paired` on a `paired` input. The hint and the payload `batch` flag share one rule, `isBatchSelection`. The checkbox and `data`-input behavior are unchanged.

| Pros | Cons |
|---|---|
| - Fixes the reported megahit case: an "individual" (`paired`) input with a `list:paired` selection now says it will be mapped over<br>- Tiny, low-risk for a release branch. It reuses the existing text, help term and server `map_over_type`<br>- `isBatchSelection` matches dev verbatim, so 20657 rebases cleanly over it | - The hint never says *what* each job gets, and "mapped over" is jargon for the non-expert in #19234<br>- No clue for the co-assembly side (a `list:paired` input taking a whole collection)<br>- Before anything is selected there's no hint, so the user only learns after picking |

### 2. Recommended: as implemented + job unit in the hint

Adds "one job per `<map_over_type>`" to the map-over line, with "per dataset" for `map_over_type == "single_datasets"` (the `paired_or_unpaired` case). Shown only for a single selected collection. When several are selected, the server batches per item and keeps the current text.

| Pros | Cons |
|---|---|
| - Directly answers "understand how the input will be processed", e.g. "one job per `paired` collection" for megahit<br>- About 10 lines in the same span plus 2 jest cases (`paired` unit, `single_datasets` → dataset). No new component, help term or FormSelect change<br>- Same logic as 20657's `BatchProcessingMode.mapOverType` (drop `SINGLE_DATASETS`; unit only when there's one value), so the meaning carries forward | - Rewords a block that 20657 rewrites anyway, so the rebase conflict is unchanged but not reduced<br>- Shows a raw type (`list:paired`-style code) rather than dev's `collectionTypeLabel` wording<br>- One more string for localization |

<details>
The reviews skipped the unit text because `single_datasets` "needs special casing (20657 handles it)". On dev that special case is one comparison: `single.map_over_type !== SINGLE_DATASETS` in `getProcessingMode`. The "only one value" rule is also one condition. Neither needs `collectionMatch.ts`, `collectionTypeLabel` or `processingMode.ts`. Keep it inline in the existing span (or in one small computed). Don't port `describeProcessingMode`. The thermo-nuclear review's warning against half-porting the dev restructuring still applies.
</details>

### 3. Port 20657's full processing hint to 25.1

Port `processingMode.ts`, `FormDataProcessingHint.vue`, the "bulk" hint ("processed as a whole in a single job", "Need one job per element?"), the new help terms, the pre-selection hint and the dropdown map-over markers (which need the FormSelect `label-area` slot).

| Pros | Cons |
|---|---|
| - Covers both halves of the megahit example (individual and co-assembly), plus a hint before selection<br>- Duplicate direct/map-over dropdown entries become distinguishable | - Hundreds of lines across about 8 files, including a FormSelect API change and new help terms. Too big for 25.1, and against John's "25.1 only if small and clear"<br>- That branch is itself `branches_need_decision` (parked scope question), so a backport would pull in unsettled design<br>- Better landed once on dev |

### 4. Fold in the queued FormData base bugs (drop matching `endsWith`, DCE drop map-over, `canMapOver` `paired_or_unpaired` parity)

These touch the same file and decide `map_over_type` on drag-and-drop, so they decide when the new hint appears for dropped items.

| Pros | Cons |
|---|---|
| - Same file and touched path. Drop matching affects the hint's accuracy on drop (e.g. a dropped `list:paired_or_unpaired` on a `paired` input is wrongly flagged as map-over and would now *also* show the hint)<br>- All are queued with a 25.1 target, so they're the same release | - Already queued as separate issues with planned cherry-picks (`tool_form_collection_drop_matching_ends_with.md`, `client_can_map_over_paired_or_unpaired_parity.md`)<br>- Not required for #19234. The reported case uses server-listed options, which carry the correct `map_over_type`<br>- Doubles the diff and pulls in `collectionTypeDescription.ts` and workflow editor terminals, so it's no longer a hint-only backport |

<details>
The drop case is the one real interaction. Without the drop-matching fix, the new hint faithfully reports the client's wrong `map_over_type` on some drops. The hint isn't wrong about what gets submitted (`batch: true` is already emitted pre-branch). It shows the bug rather than causing it. Note the dependency in the PR description or the queued issue rather than merging the work.
</details>

### 5. Fold in paging / off-page selection fixes

Covers `tool_options_paging_splits_map_over_entry.md` and `tool_form_offpage_collection_selection_lost_on_refresh.md`.

| Pros | Cons |
|---|---|
| - Both decide whether a map-over option, and so this hint, is available or kept | - Option paging doesn't exist on 25.1 or 26.0 (it's from 26.1+), so neither applies to this base<br>- Already queued separately |

### 6. Contract: hint fix without the `isBatchSelection` refactor

Inline the rule in `showBatchInfo` and leave `createValue` alone.

| Pros | Cons |
|---|---|
| - About 7 fewer lines and one fewer commit | - Brings back the duplicated rule the thermo-nuclear review removed: the hint and payload could drift<br>- Loses the hunk that's identical to dev, so the 20657 rebase gets worse<br>- Nothing to gain. The branch is already minimal |

### 7. Workflow-run form wording ("mapped over this **tool**")

Reword for workflow run inputs, where the hint now also appears.

| Pros | Cons |
|---|---|
| - Slightly more accurate in the workflow run form | - The wording was already used there for `data` inputs before this branch<br>- More strings for little gain. Belongs with 20657's hint rewrite if anywhere |

## Inputs reviewed

`index.md`, `plan.md`, `initial_implementation_debrief.md`, `subagents/normal_review.md`, `test_challenges_debrief.md`, `thermo_nuclear_review.md`, `baseline_refactor.md`, `codex_review.md`; branch diff; issue #19234 text (no comments); the 20657 branch record and `processingMode.ts` / `FormDataProcessingHint.vue`; the four queued `gx_issues/to_file/` drafts. Scope comments from reviews: unit text (normal review, initial debrief: deferred), workflow-run wording (normal review: deferred), template/`getProcessingMode` restructure (thermo: deferred to dev), drop `map_over_type` on plain `data` inputs (normal review: pre-existing). All considered above.
