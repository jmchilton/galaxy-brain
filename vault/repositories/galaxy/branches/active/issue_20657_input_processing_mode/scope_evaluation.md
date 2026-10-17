# issue_20657_input_processing_mode — scope evaluation

**Recommendation: modest expansion.** Keep the branch's core: the processing hint, the help terms, the dropdown markers and the collection-type matching fixes. Fold in two small fixes to code the branch already touches. (1) Repair the five admin/role/user `remove_selected_*` XPath selectors in `navigation.yml`. They hard-code `/i[contains(@class,'multiselect__tag-icon')]`, but vue-multiselect v3 renders a `<button>`, the same breakage the branch fixed for `tool_form.parameter_multiselect_tag_close`. (2) Give `list:list` (and `list:list:paired`) friendly labels in `COLLECTION_TYPE_TO_LABEL`, so the hint and marker don't print raw "list:list". Both are a few lines and the same bug class as code already in the diff. Keep NestTool on a mapped DCE, the `useKeepOptions`/FormData decomposition, the docs-site category, a new nesting tool and the job count (already split to `tool_form_job_count`) out of this PR, as follow-ups or separate PRs.

Evaluated at `be1f6486427`: 19 commits on `origin/dev` `4fe00d9e7ab`, 23 files, +1385/−148. About 890 added lines are tests (FormData.test 707, processingMode.test 60, ToolForm.test 26, collectionTypeDescription.test 17, Selenium 74, API 2). About 500 non-test lines were added. Nothing is generated.

## Possible Decompositions

The history was already reordered (`baseline_refactor.md`) so that the baseline tests and generic refactors land first. These are options for John, not a recommendation.

**Option A: two PRs (base + feature)**
1. *Base*: `ef706e3a4b2` (baseline tests), then `6472a21884d` (move `collectionTypeToText`), `ab73817f5df` (FormSelect `label-area` slot), `5686ba1e0b7` (`findDataOption`/`mergeDataOptions` helpers) and `510945a965f` (`tool_form_clear_multiselect_tags` in NavigatesGalaxy). Each is behavior-preserving and passes on dev.
2. *Feature*: the remaining 14 commits: hint, help terms, markers, matching fixes, E2E, Codex fixes and tidy.

**Option B: three PRs (base, collection matching / test infra fixes, feature)**
1. As A.1.
2. *Fixes independent of the hint*:
   - `b6c76670f0c`: TS `canMapOver` parity for `X:paired_or_unpaired`. This also changes the workflow editor. It is self-contained in `collectionTypeDescription.ts`.
   - `0878a2b9d6f`: the multiselect tag-close selector fix. This repairs `RunsToolTests` on dev, and is the natural home for the recommended admin selector fix.
   - Optionally the dropped-collection matching (`1042b1f2793`, `2c358d60472`). This needs hand-splitting, because `matchCollectionType` was born in `processingMode.ts` and only moved to `collectionMatch.ts` in `be1f6486427`.
3. *Feature*: hint, terms, markers, E2E, the paging fix (`8acaec218b3`) and the nest-hint rule.

**Option C: B with the feature split into hint and markers**
1. B.1.
2. B.2.
3. *Hint + help terms* (`4baeefa6c4b`, `41b5658b8a5`, `672cf33ecb3`, and the hint half of the E2E). This alone fixes #19234.
4. *Dropdown markers + duplicate-option snap-back fix* (`e66828a1464`, `bdae86148a7`, `8acaec218b3`, the marker half of `be1f6486427`). Needs hand-splitting of the E2E commit and the tidy commit.

## Scopes considered

### 1. As implemented

Hint under every tool-form data input, driven by the selected value (batch/map-over vs reduction), with `collections.mapOver` extended plus new `collections.reduction` and `collections.nestToMapOver` terms. Map-over badges in the dropdowns, a fix for duplicate list/list:list options, collection-type matching aligned with the server, and the tool-form tag-close selector fix.

| Pros | Cons |
|---|---|
| - Fixes #19234's root cause (hint gated on input type, not the value)<br>- Covers the in-app docs half of #20657, the half John asked for<br>- Related bugs in touched code (snap-back, `endsWith` matching, `canMapOver` parity, paging split, dropped DCE) are already fixed | - Leaves known sibling breakage (admin XPath selectors) in a file the branch edits<br>- `list:list`, the main nested case the hint describes, renders as a raw type string |

### 2. Modest expansion (recommended): + admin multiselect selectors + `list:list` labels

Change `/i[contains(@class,'multiselect__tag-icon')]` to `/*[contains(...)]` (or `button`) in the five `navigation.yml` admin/role/user selectors. Add `list:list` → "list of lists" and `list:list:paired` → "list of lists of pairs" (wording to taste) to `COLLECTION_TYPE_TO_LABEL`.

| Pros | Cons |
|---|---|
| - Same root cause as the selector the branch already fixed; `test_admin_role_and_user_forms.py` (added to dev 2026-09-26) uses `remove_selected_user`/`remove_selected_role`<br>- Polish candidate #1 from the earlier debrief, a one-line data change in a module the branch already moved into<br>- Tiny and low-risk, matching reviewer preference for fixing related bugs together | - The admin tests need a Selenium/Playwright run to confirm they were red, and are unrelated to tool forms<br>- `COLLECTION_TYPE_TO_LABEL` also feeds collection builder text; the new keys must not change builder titles (check the consumers) |

<details>
<summary>Notes</summary>

The admin selectors weren't verified red locally. vue-multiselect is `^3.3` and its dist queries `button.multiselect__tag-icon`, so a `/i` child step cannot match. The branch's own debriefs (test challenges, E2E polish) flagged this twice as "probably stale". If a run shows the admin forms use a different widget that still renders `<i>`, drop that half.

</details>

### 3. Larger expansion: + NestTool on mapped DCE

Add an API test that maps `__NEST__` over a `list:paired` (one job per `paired` DCE). If it re-nests the whole parent list, fix `NestTool.produce_outputs`.

| Pros | Cons |
|---|---|
| - The new `nestToMapOver` term sends users to Nest collection, so its behavior matters more now | - Unverified (code reading only), and the term recommends nesting a `list` directly, not mapping Nest over pairs<br>- Server tool change in a different subsystem; better as its own small PR with a red test |

### 4. Larger expansion: hint in the workflow run form's tool steps

Show the same hint for tool-step inputs in `WorkflowRunDefaultStep`.

| Pros | Cons |
|---|---|
| - Same confusion exists when running workflows | - Workflow run has its own batch/linked controls, which the branch deliberately leaves alone (tests pin this)<br>- Step inputs there are usually connected, not user-selected; a different design question |

### 5. Refactor expansion: `useKeepOptions` composable / FormData.vue decomposition

| Pros | Cons |
|---|---|
| - Removes the manual reactivity counter and the three-way keep-option reconciliation | - Pre-existing structure (FormData.vue was 1359 lines on base, 1361 now)<br>- Large churn in a hot component; mixes refactor with a feature/bug-fix PR |

### 6. Expansion: `WorkflowRunInputStep` / `WorkflowRunFormSimple` id+src dedupe

| Pros | Cons |
|---|---|
| - Consistency with `mergeDataOptions` | - Unreachable: those rows come from history contents, which never carry map-over entries (Codex review verdict) |

### 7. Expansion toward the rest of #20657: docs-site "User documentation" category, GTN tutorial, new nesting tool

| Pros | Cons |
|---|---|
| - Would close #20657 fully | - John's issue comment prefers in-app help terms over a new docs section, and the branch does that<br>- Nest collection and Apply rules already exist, and `nestToMapOver` points to them; a new tool is a separate feature request<br>- GTN is out of repo |

### 8. Re-merge with `tool_form_job_count`

| Pros | Cons |
|---|---|
| - One PR telling the whole "how will this run" story | - The split was deliberate; that branch has its own scope evaluation (keep as implemented) and server/meta refactor<br>- Doubles the review surface; the two merge independently |

### 9. Contraction: hint only (drop markers and matching fixes)

| Pros | Cons |
|---|---|
| - Smallest diff that fixes #19234 | - Discards real bug fixes (snap-back, `paired_or_unpaired` matching, `canMapOver` parity) that the markers exposed<br>- Runs against the user's stated preference for fixing related bugs together; better handled as a decomposition (Option C) than a contraction |
