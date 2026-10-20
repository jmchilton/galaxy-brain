# Scope evaluation (round 2) — issue_19234_batch_mode_hint_25.1

**Recommendation: keep.** The branch already took the round-1 modest expansion: the hint now names the job unit, e.g. "mapped over this tool: one job per dataset pair" for megahit's `list:paired` on a `paired` input, using 25.1's existing `COLLECTION_TYPE_TO_LABEL`. That answers #19234's "some clue to understand how the input will be processed" for the batch case the issue names. Every remaining candidate is one of three kinds. It's already filed elsewhere: #24218 `canMapOver` parity, #24220 drop `endsWith`, #24219 and #24221 paging/off-page, all targeting 26.0 or 26.1, not 25.1. Or it's unsettled design on the parked dev branch `issue_20657_input_processing_mode`: the joint-processing ("bulk") hint, a pre-selection hint, dropdown markers. Or it's pre-existing wording that 20657 rewrites. The one in-branch candidate is accurate wording for multi-selections ("each selected collection will be run as a separate job"). It's about 3 lines, but it only fires on `data_multiple`/module forms, has no user report, and would add a third hint string that dev's `describeProcessingMode` replaces anyway. That's not enough to justify another re-scope round on a 25.1 backport.

Branch: `origin/release_25.1` `8bb256be5b1` → `c2987f4abad` (7 commits). Diff: `FormData.vue` +45/-7, `variants.ts` +7, `FormData.test.js` +222/-2.

## Possible Decompositions

About 52 non-test lines and about 222 test lines. The branch is over 100 lines only because of tests.

1. **One PR (as is).** Baseline tests → `isBatchSelection` refactor → fix → drop test → job unit → label/localize → `mapsOver` dedupe. The natural unit.
2. **Two PRs.** (a) `9b6f39b7609` baseline tests + `6028edab3f3` `isBatchSelection` refactor (no behavior change, same hunk as dev). (b) Everything else. Order: (a) then (b).
3. **Original scope + unit follow-up.** (a) through `ad7c3fcc447` (= `_alt_original_scope`, generic "mapped over" hint). (b) `617bb92f50f`..`c2987f4abad`, job unit text. Order: (a) then (b). Lets reviewers take the hint without the new wording if the unit strings are contested.
4. **Baseline tests alone**, per the "Baseline tests" convention: `9b6f39b7609` as its own PR, then 1, 2(b) or 3.

## Scopes considered

### 1. As implemented (recommended): selection-driven map-over hint with job unit

When the selected value carries `map_over_type`, or a collection sits on a `data` input, the hint shows "The supplied input will be *mapped over* this tool". For a single selection it adds ": one job per <label | `type` collection | dataset>". The hint and the payload `batch` flag share `isBatchSelection`. The checkbox and other variant behavior are unchanged.

| Pros | Cons |
|---|---|
| - Fixes the reported megahit "run individually" case and says what each job gets<br>- Same wording as dev ("one job per dataset pair") through the existing 25.1 label map, so 20657's text carries forward<br>- Small (~52 lines), reviewed four ways (normal, rescope, thermo, codex) with no open findings<br>- Unit semantics checked against `meta.py`/`subcollections` for `X`, `single_datasets`, and plain `data` flattening | - The co-assembly side (a `list:paired` taking a whole collection) still gets no hint<br>- No hint before a selection<br>- Multi-selection keeps the loose "mapped over" line (see 2)<br>- Lead sentence still not localized (predates the branch) |

### 2. Expand: accurate multi-selection wording

When several values are selected and any maps over, say "each selected collection will be run as a separate job" instead of "mapped over this tool". `__collection_multirun_parameter` only splits when there's exactly one batch value, so more than one value means a plain multirun over the values.

| Pros | Cons |
|---|---|
| - More accurate: the server doesn't split collections when several are selected<br>- About 3 lines plus a test expectation change, same span | - Only reachable from `data_multiple` "Dataset collection" and module "Multiple collections" variants. Not the #19234 case, and no user report<br>- The branch *newly* shows the loose line for these selections, but the line matches the payload's existing `batch: true`, so it's not a regression in what gets submitted<br>- Adds a third hint string that dev's `describeProcessingMode` replaces. Better in 20657<br>- A second re-scope round costs more than the fix is worth |

### 3. Expand: joint-processing ("bulk") hint for direct collection selection

Show something like "processed as a whole in a single job" when a collection fills a collection input directly. That's megahit's co-assembly side.

| Pros | Cons |
|---|---|
| - Covers the other half of the megahit example in #19234 | - Would show on every collection input, a big UX change for a release branch<br>- Part of 20657's design, which is parked as `branches_need_decision`. A backport would freeze unsettled wording on 25.1<br>- The issue asks for the missing *batch* info. The bulk text never existed |

### 4. Port 20657's full processing hint (component, help terms, pre-selection hint, dropdown markers)

| Pros | Cons |
|---|---|
| - Complete answer: both halves, a pre-selection hint, distinguishable dropdown entries | - Hundreds of lines across about 8 files, including a FormSelect API change. Against "25.1 only if small and clear"<br>- Unsettled design. Land once on dev |

### 5. Fold in filed base bugs: #24220 drop `endsWith`, #24218 `canMapOver` parity

| Pros | Cons |
|---|---|
| - #24220 decides `map_over_type` on drop in the same file, so some drops make the new hint show (and report) a wrong unit | - Already filed and assigned with their own backport branches, targeting release_26.0 (25.1 server lacks compound support for #24218)<br>- #24220 depends on #24218. Pulling both in brings in workflow editor terminals and `collectionTypeDescription.ts`<br>- Not needed for #19234's server-listed options, which carry the correct `map_over_type`. The hint shows the drop bug but doesn't cause it |

### 6. Fold in filed paging bugs: #24219, #24221

| Pros | Cons |
|---|---|
| - Both decide whether a map-over option, and so this hint, is available | - Option paging is 26.1+, so neither applies on 25.1<br>- Already filed separately |

### 7. Contract: revert to original scope (`_alt_original_scope`, `ad7c3fcc447`)

Drop the job-unit commits and keep the generic "mapped over this tool." line.

| Pros | Cons |
|---|---|
| - About 25 fewer lines, no new strings to localize, fewer test expectations | - Undoes the expansion John took after round 1. The generic line is jargon to the #19234 reporter<br>- The alt is already pushed if reviewers push back, so contracting now gains nothing |

### 8. Localize the lead sentence / workflow-run "this tool" wording

| Pros | Cons |
|---|---|
| - Translators could reorder the full sentence. More accurate in the workflow-run form | - Both predate the branch, and dev splits the sentence the same way<br>- String churn in a backport. Belongs with 20657's hint rewrite |

<details>
Review scope comments, all considered above:

- Normal review: unit text (now done), workflow-run wording (8), `data` drop with no `map_over_type` (pre-existing).
- Rescope review: multi-selection wording (2), unlocalized lead (8), dev's `nested <type>` fallback (no change; the dev side can adopt `<code>` form).
- Thermo round 2: `{code,text}` vs dev's string, template/computed split, file size, `single_datasets` literal. All are dev-restructuring items and stay out of 25.1.
- Codex round 2: none.
- Round-1 scope eval: options 3–7 still hold. The queued `to_file/` drafts have since been filed as #24218–#24221, with targets of 26.0/26.1, which further separates them from this 25.1 branch.

Option 2 is the only defensible expansion. It's borderline under the "default to modest expansion" rule. It's left out because it doesn't touch the reported case, it isn't a payload regression, and dev already owns the replacement wording. If John wants it anyway, it's a single commit on top: a `rest.length > 0` branch in the template plus one changed expectation in the two multi-selection tests.
</details>

## Inputs reviewed

`index.md`, `plan.md`, `initial_implementation_debrief.md`, `implementation_rescope_debrief.md`, `alts/original_scope.md`, `subagents/normal_review.md`, `subagents/rescope_review.md`, `codex_review.md`, `thermo_nuclear_review.md`, `baseline_refactor.md`, `test_challenges_debrief.md`, `earlier_drafts/1/scope_evaluation.md`. Also the branch diff at `c2987f4abad`, `variants.ts` variant table, `meta.py` multirun logic, the #19234 issue text (no comments), the 20657 record, and the filed issue records for #24218–#24221.
