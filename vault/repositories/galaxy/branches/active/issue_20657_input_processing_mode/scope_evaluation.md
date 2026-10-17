# issue_20657_input_processing_mode — scope evaluation (round 2, post re-scope)

**Recommendation: modest expansion.** Keep everything the branch has now, including the first re-scope (labels for `list:list` and `list:list:paired`, and the admin selector fixes). Add one server fix: when a visible, in-history HDCA is selected but sits outside the current option page, pin it the way `_pin_live_hda_inputs` already pins HDAs. Today, a form refresh (`ToolForm.onUpdate` replaces the options) silently drops that selection back to the first option. That changes which collection runs and flips a map-over selection's `batch` flag, so the hint and the submitted job count go wrong. This is the residual Codex P1. To fix it, `_carry_selected_hdca` would emit the `_classify_hdca` entries (direct and map-over) with `keep=True` into the existing `pinned["hdca"]` list. The client already merges `pinned` and resolves options by identity with `findDataOption`, so no client change should be needed. Estimate: about 15–25 server lines plus one API test (limit 1, selection on page 2, refresh keeps both entries). Also fold in the one-token drop-alert fix: map the parameter side through `collectionTypeToText`. Precondition: on refresh, `other_values[self.name]` must hold the selected HDCA. If it only holds the batch wrapper, so that pinning needs `map_over_type` carried through `from_json`, the fix becomes cross-layer. In that case keep scope and make the pin fix the first follow-up PR. Everything else listed below stays a follow-up.

Evaluated at `10ae420a663`: 29 commits on `origin/dev` `4fe00d9e7ab`, 29 files, +1689/−223. About 1164 added lines are tests and E2E infra; about 525 are non-test. Nothing is generated. Commit hashes changed with the `baseline_refactor.md` history rewrite, so every hash below is fresh (the round-1 evaluation's hashes are stale).

## Possible Decompositions

These are options for John, not a recommendation. The common base is the same in every option.

- *Base*:
  - `b89794a9f36`: baseline tests for drop matching and dedupe
  - `76750495c46`: baseline tests for option paging
  - `5125a9e5108`: `collectionTypeToText` move
  - `57fc5c870e3`: FormSelect `label-area` slot
  - `05907884de9`: `findDataOption` and `mergeDataOptions` helpers
  - `d3afe84699d`: `tool_form_clear_multiselect_tags`

  All of these are behavior-preserving and pass on dev.

**Option A: two PRs (base + feature).**
1. Base.
2. Everything else (23 commits).

**Option B: four PRs (base, test-infra selectors, paging, feature).**
1. Base.
2. *Selector repairs*: `03bcb664aca` (tool-form tag close) and `bcf367338e4` (admin `remove_selected_*`). Two one-line `navigation.yml` fixes for vue-multiselect 3's `<button>`. They repair `RunsToolTests` and `test_admin_role_and_user_forms.py` on dev. This PR is independent of everything else.
3. *Option paging*:
   - `826a64a9784`: server comment, and `mergeDataOptions` keyed by `map_over_type`, with a ToolForm test
   - `562ce4f58fa`: keep a row's entries on one page, plus the unit and API tests

   This needs base, because the baseline tests and the helper live there. It is the natural home for the recommended HDCA pin fix.
4. *Feature*: hint, terms, markers, matching, labels, E2E and tidy (`2c302a15ee9` … `10ae420a663`, minus the commits above).

**Option C: B, with matching fixes and labels pulled out of the feature.**
1. B.1, B.2 and B.3.
2. *Collection-type matching*:
   - `00e2bf07047`: TS `canMapOver` parity. Self-contained; it also changes the workflow editor.
   - `68b8d3969e5`, `9ff2eb69afd` and `057ac69f904`: drop matching. These need hand-splitting, because `matchCollectionType` is born in `processingMode.ts` and moves to `collectionMatch.ts` in `671ebf9d3bb`.
3. *Nested labels*: `5736d9f5daa` plus `4df1318d982`. It touches one line of `processingMode.ts`, so it lands after or with the feature, or that line is hand-split.
4. *Feature*: hint, terms, markers and E2E.

**Option D: C, with the feature split into hint and markers.**
1. C.1 through C.3.
2. *Hint + help terms*:
   - `2c302a15ee9`, `0bd36c79f57`, `d72197ed672` and `2edc9db1be5`
   - the hint half of `5d941fd38f8`, `d550891ba84`, `a301b146e1b`, `d42af5ade60`, `46663ea157c` and `3664a11088f`

   This alone fixes #19234.
3. *Dropdown markers and duplicate-option snap-back*: `9eff87c8e21`, `671ebf9d3bb` (`FormDataOptionLabel`), `10ae420a663` and the marker half of the E2E and spec split. The E2E, test-challenge and spec-split commits must be hand-split.

## Scopes considered

### 1. As implemented

The branch adds:
- A value-driven processing hint under tool-form data inputs (map-over vs reduction), with the `collections.mapOver`, `collections.reduction` and `collections.nestToMapOver` terms.
- Map-over badges in the dropdowns, and a fix for duplicate-option snap-back.
- Server-aligned collection matching, including for dropped elements, plus `canMapOver` parity.
- A paging fix that keeps a row's entries on one page.
- Nested collection labels and the multiselect selector fixes.

| Pros | Cons |
|---|---|
| - Fixes the #19234 root cause and covers the in-app docs half of #20657, the approach John asked for in the issue<br>- The first re-scope's items are in and E2E-verified (admin tests green on Playwright and Selenium)<br>- Reviewed several times (Codex, thermo-nuclear, test challenge) | - A visible collection selected from a later page is still lost on refresh. The branch made map-over selections the thing users pick from those pages, so this now also flips `batch`<br>- The drop alert still mixes friendly and raw types ("list of lists dataset collection is not a valid input for list:paired …") |

### 2. Modest expansion (recommended): pin later-page HDCA selections + drop-alert param labels

In `DataCollectionToolParameter._carry_selected_hdca`, handle a visible in-history HDCA that is missing from the current page. Append its `_classify_hdca` entries to `builder.pinned["hdca"]` with `keep=True`, mirroring `_pin_live_hda_inputs`. In `FormData.vue` (~L913), use `orList(props.collectionTypes.map(collectionTypeToText))`, as L1109 already does.

| Pros | Cons |
|---|---|
| - Same subsystem and the same paging scenario the branch already fixed twice (`826a64a9784`, `562ce4f58fa`). Codex flagged it as P1 on this branch<br>- Reuses existing pieces (`pinned`, `_classify_hdca`, `findDataOption`); no new client code expected<br>- Closes an HDA/HDCA asymmetry: HDAs are already pinned on refresh<br>- The alert fix is one token and matches the existing L1109 pattern | - First change to `basic.py` in this branch, and a server change in a mostly client PR (or put it in the paging PR, B.3)<br>- Unverified that `other_values[self.name]` holds the HDCA for a batch value on refresh. If not, it grows cross-layer<br>- Needs dedupe when the selected HDCA is already on the page |

<details>
<summary>Notes</summary>

- **Pre-existing on base.** `basic.py` is unchanged vs `4fe00d9e7ab`. Pagination in this area is recent dev work, including mvdbeek's 2026-10-02 hidden-collections change.
- **Why it matters for this branch.** After `562ce4f58fa`, a refreshed page 0 has both entries for a collection or neither. In the "neither" case, `findDataOption` falls back to the first option, and `createValue` re-emits the new value. The user sees the hint change, but nothing warns them.
- **Severity.** The page size is 50, so this hits users with more than 50 matching collections, or users who found the collection by search.
- **Red test.** An API `build` call with `limit: 1`, the selected HDCA (submitted as a batch value with `map_over_type`) on page 2, and no offset. Assert that `pinned.hdca` holds both its direct and multirun entries.
- **Fallback.** If `from_json` loses the HDCA for batch values, carrying `map_over_type` server-side is a cross-layer change. In that case, park it as its own PR rather than growing this one.

</details>

### 3. Workflow editor `NodeOutput.vue` reuses `COLLECTION_TYPE_TO_LABEL`

| Pros | Cons |
|---|---|
| - One source of collection-type wording | - Different subsystem (workflow editor terminals); the visible text changes ("list of pairs dataset collection")<br>- Wording is unsettled across the wizard, the creator help and `CollectionDescription`; deserves its own small wording PR |

### 4. Localize the hint as whole sentences, not fragments

| Pros | Cons |
|---|---|
| - Every `localize()` string in `processingMode.ts` is new in this branch, so nothing has been translated yet and there's no churn for translators. This undercuts the thermo-nuclear review's reason to defer<br>- Already centralized in `describeProcessingMode` | - The label, `<code>` and help link are interleaved mid-sentence, and `localize` has no interpolation. A real fix needs a template mechanism FormData lacks<br>- A code-quality point, not a scope driver; most of Galaxy's client concatenates the same way |

### 5. FormData.vue decomposition / `useKeepOptions` composable

| Pros | Cons |
|---|---|
| - Removes the manual reactivity counter and three-way keep-option logic | - Pre-existing structure (1359 lines on base, 1357 now); big churn in a hot component; mixes refactor with a feature PR |

### 6. NestTool on a mapped DCE

| Pros | Cons |
|---|---|
| - The `nestToMapOver` term points users at Nest collection | - Unverified (code reading only), and the term recommends nesting a whole `list`, not mapping Nest over pairs<br>- Server tool in another subsystem; its own red test and PR |

### 7. Tag chip close-x overlap (cosmetic)

| Pros | Cons |
|---|---|
| - Visible in this branch's screenshots | - A global vue-multiselect / theme CSS issue, unrelated to processing mode; changes every multiselect |

### 8. Hint in workflow run form tool steps

| Pros | Cons |
|---|---|
| - The same confusion exists when running workflows | - The run form has its own batch/linked controls, which this branch deliberately leaves alone (pinned by tests); its inputs are usually connected |

### 9. Rest of #20657: docs-site category, GTN, new nesting tool

| Pros | Cons |
|---|---|
| - Would close #20657 fully | - John's issue comment prefers in-app help terms, which the branch delivers; Nest and Apply rules already exist; GTN is out of repo |

### 10. Re-merge with `tool_form_job_count`

| Pros | Cons |
|---|---|
| - One "how will this run" story | - The split was deliberate, and that branch has its own scope decision; it doubles the review surface |

### 11. Contraction: hint only, or drop the re-scope additions

| Pros | Cons |
|---|---|
| - Smallest diff that fixes #19234 | - Throws away verified fixes (snap-back, matching, paging, selectors) against the user's stated preference. If size is the concern, the decompositions above handle it better than a contraction |
