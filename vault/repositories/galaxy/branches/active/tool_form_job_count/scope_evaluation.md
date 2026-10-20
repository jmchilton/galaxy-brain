# tool_form_job_count — scope evaluation (second pass, post-rescope)

**Recommendation: keep as implemented.** The first evaluation's modest expansion has already landed. Run is disabled on a server-detected batch mismatch and on remap with more than one job, an empty batch only warns, and section and repeat labels are qualified. Every remaining candidate is either a separate feature (workflow run form, a request-API dry run, a large-batch confirmation), a measured performance follow-up (`match_collections`), or a step backwards (reverting to the alt branch, dropping the label work, re-merging with `issue_20657`). None is clearly warranted, so no further re-scope and no park.

Evaluated at `d5948da2ef8`: 25 commits on `origin/dev` `5ff1e46b8c3`, and upstream `dev` has not moved past it (re-fetched 2026-10-17). `git merge-tree` against dev is clean. The `permutations.py` conflict noted in index.md is against the stale fork head `5d2684ace76`, not this head. The diff is 22 files, +1573/−171, with about 980 lines of tests. Nothing is generated. About 590 non-test lines were added.

## Possible Decompositions

The history was already reordered (`baseline_refactor.md`) so that generic pieces land first, which allows several splits. These are options for John to choose from, not a recommendation.

**Option A — two PRs (generic base + feature)**
1. *Base* (commits 1–6):
   - `a79cf7072d3` and `4e4b90a51e6`: baseline tests.
   - `501bc7938ef`: shared meta classifier and collection loading.
   - `a7fd0b8e4e7`: `ObjectNotFound` for unknown batch ids, so a 500 becomes a 404.
   - `a413d66c35c`: `visitInputs` parents, `findInputPathByDottedName`, `repeatTitle`.
   - `d0cb34f6d44`: the `tool_form_select_collection` E2E helper, which drops a sleep in a rerun test.

   This is about 700 lines, mostly tests. Each piece passes on dev without the feature.
2. *Feature* (the remaining 19 commits): job preview in the build response, the tool form notice, Run blocking, and E2E.

**Option B — three PRs (server base, client base, feature)**
1. *Server*: `a79cf7072d3`, `501bc7938ef`, `a7fd0b8e4e7` (meta refactor + 404 fix).
2. *Client/test infra*: `4e4b90a51e6`, `a413d66c35c`, `d0cb34f6d44` (form utilities + E2E helper).

   Steps 1 and 2 are independent and can land in either order.
3. *Feature*, as in A.2.

**Option C — four PRs (B, with the feature split into API and UI)**
1. As in B.1.
2. As in B.2.
3. *Server `job_expansion`*:
   - `3ac60b5743e` and `b0ebcff7ddf`: the preview and its access check.
   - `ede8f2a2291` and `b2eea968529`: the API test and the shared-child counting fix.
   - `d5948da2ef8`: fold batch detection into `summarize_meta_expansion`.

   On its own this is an API field with no consumer, so reviewers may want it paired with 4.
4. *Tool form UI*: `ToolFormJobCount.vue`, `jobCount.ts`/`useJobExpansion`, Run blocking, stale-response guards, and the E2E tests. Splitting it out needs some hand-splitting, because the client commits come between the server ones.

**Option D — B plus a ToolForm race-fix PR.** Take the `buildRequestId` stale-response guard (and the dead `v-slot:footer` Run button removal) out of `b925adb9b9e` into a small client PR. The race exists on dev today without the feature. This requires hand-splitting a commit.

**Option E — single PR.** The PR text should call out the `meta.py` refactor, the 404 change and the stale-response guard.

## Scopes considered

### 1. As implemented (recommended)
The build response carries `job_expansion` (count, reason, per-input counts), computed without loading HDAs through the classifier that execution also uses. The tool form shows "This will run N jobs." with a breakdown and notices for empty, mismatch and remap. Run is disabled, with the reason in its tooltip, only for a mismatch or for remap with more than one job. Labels are qualified by section and repeat. The branch also carries the `meta.py` refactor, the 404 fix, the stale-response guards and a shared E2E helper.

| Pros | Cons |
|---|---|
| <ul><li>Closes the open question from both earlier debriefs: Run now blocks only where the server would reject the request.</li><li>An empty batch stays runnable. This matches dev's supported map over an empty collection (`test_map_over_empty_collection`), and the first evaluation was wrong to say otherwise.</li><li>Preview state is now held together in `useJobExpansion`, and stale previews are dropped on a failed update and on non-refreshing edits.</li><li>Generic pieces (`findInputPathByDottedName`, `repeatTitle`, the E2E helper) are reused by existing callers, not only by the feature.</li><li>E2E covers count, empty and mismatch under both Playwright and Selenium.</li></ul> | <ul><li>A single PR is large (~1.7k changed lines), but the decompositions above handle that.</li><li>The server preview now gates Run, so a preview bug blocks submission. It is limited to definite reasons and pinned against `expand_meta_parameters` as an oracle.</li></ul> |

### 2. Contract — revert to `tool_form_job_count_alt_original_scope`
Warnings only, with Run always enabled and bare labels.

| Pros | Cons |
|---|---|
| <ul><li>Smaller. The preview can never block.</li></ul> | <ul><li>Reopens the "disable Run?" question that reviewers are likely to raise.</li><li>Throws away reviewed, tested work, including the stale-preview fixes found during the re-scope.</li></ul> |

### 3. Contract — keep Run blocking, drop the qualified labels
Remove `findInputPathByDottedName` and `repeatTitle`, and stop passing `visitInputs` parents.

| Pros | Cons |
|---|---|
| <ul><li>Takes `Form/utilities.js` and `FormRepeat.vue` out of the diff.</li></ul> | <ul><li>The mismatch notice would name a bare "Select" twice in common cat1-style tools (the E2E mismatch case).</li><li>The utilities change is small, is already split into its own base commit, and `findInputByDottedName` reuses it.</li></ul> |

### 4. Expansion — confirm before launching a large batch
Ask for confirmation when the count is over a threshold, e.g. above 100 jobs.

| Pros | Cons |
|---|---|
| <ul><li>Natural next use of the count, and guards against an accidental `list:list` multiply.</li></ul> | <ul><li>New product behaviour with no issue asking for it: the threshold, a config option, and a dialog in the run path.</li><li>The count is already shown in the notice and the tooltip. This is better as its own feature if users want it.</li></ul> |

### 5. Expansion — count for the request/async (nested) API
Generalize `summarize_meta_expansion` to `RequestInternalToolState` for `/api/jobs` previews.

| Pros | Cons |
|---|---|
| <ul><li>The classifier already handles `_is_async_batch`.</li></ul> | <ul><li>Still has no consumer. The tool form posts flat state to `build`.</li><li>Needs new endpoint or field design.</li></ul> |

Correction (2026-10-20): the tool form *submits* via async tool requests by default, so parity matters even though the preview stays on `/build`. The flat count agrees with async expansion; see [async_parity.md](async_parity.md).

### 6. Expansion — `match_collections` performance for linked nested collections
Compare the structure of two or more linked nested collections in SQL rather than walking them.

| Pros | Cons |
|---|---|
| <ul><li>Bounds build latency in that one case.</li></ul> | <ul><li>It is the same walk execution already does, and only in the case of two or more linked collections.</li><li>It needs a new model query, so it is better as a measured follow-up.</li></ul> |

### 7. Expansion — job or invocation count on the workflow run form
Show the same count on the workflow run form.

| Pros | Cons |
|---|---|
| <ul><li>Same user question.</li></ul> | <ul><li>Different expansion code (`expand_workflow_inputs`), a different form, and different semantics.</li><li>A separate feature.</li></ul> |

### 8. Re-merge with `issue_20657_input_processing_mode`
Combine the two branches into one PR.

| Pros | Cons |
|---|---|
| <ul><li>One "explain batching" story.</li></ul> | <ul><li>Both branches are large and independent, and either can land first. A re-merge doubles review size for no functional gain.</li></ul> |

<details>
Items carried from earlier reviews that are not scope items, because they are unrelated to the touched behaviour or were deliberately declined:

- `_carry_selected_hdca` doesn't carry `map_over_type` on rerun (the `issue_20657` area).
- NestTool may re-nest on a mapped DCE (a separate tool bug).
- Composed `localize()` fragments: the client has no convention for them.
- The client blocks a dataset + collection batch before the server notice can show (pre-existing).
- The thermo-nuclear pass declined `LastQueue` for the `buildRequestId` guards, `split_count` reuse, and the identifier-key helper. These are code-shape questions and don't change scope.

Optional dataset batches with `values: []` give `job_count === 0`. They warn and do not block, consistent with the empty-collection decision. Required inputs are already caught by client validation.
</details>
