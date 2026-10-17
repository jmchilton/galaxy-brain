# tool_form_job_count — scope evaluation

**Recommendation: modest expansion.** Keep everything as implemented and add two small client changes in code the branch already touches. First, disable Run, with the reason in its tooltip, when the server preview says the request is certain to fail or do nothing: `batch_mismatch`, `job_count === 0`, or remap with more than one job. Both debriefs left this as an open question, and today the form shows a warning and then lets the user submit a request the server rejects. Second, qualify input labels inside sections and repeats in the breakdown and mismatch text, so the notice doesn't name a bare "Select". Keep the rest out: the `match_collections` performance follow-up, counting for the nested/request API, a workflow-run-form count, and re-merging with `issue_20657_input_processing_mode`.

Evaluated at `f89f6b20889` (12 commits on `origin/dev` `5ff1e46b8c3`). 16 files, +1159/−155, of which about 670 lines are tests. Nothing is generated.

## Possible Decompositions

The branch is already ordered for splitting. Commits 1–3 are a baseline, refactor and fix that have value on their own, and the feature replays on top. These are options, not a recommendation.

**Option A — two PRs (base + feature)**
1. *Meta expansion refactor + 404 fix* (`f0604e6d1d0`, `1eb010d86a9`, `2ee3cb1e6a3`; about 430 lines, 280 of them tests). Baseline unit tests for sync, async and validate expansion; shared `_meta_value_classifier` / `_split_meta_inputs` / `_load_batch_collection`; unknown batch collection ids raise `ObjectNotFound` instead of `NoResultFound` / `AttributeError` (a 500 becomes a 4xx). It stands alone and is easy to review against the baseline tests.
2. *Job count preview, server + client + tests* (the remaining 9 commits). Lands after 1.

**Option B — three PRs (base, API, UI)**
1. As in A.1.
2. *Server `job_expansion` in the build response* (`b373a280c89`, `7ee022aad37`, `75e32b6127a`, `f89f6b20889`): `summarize_meta_expansion`, `element_count_at_depth`, `split_count`, `count_combos`, access check, API + unit + model tests. This adds an additive API field with no consumer until 3 lands. Reviewers may object to the unused field. Pair it with 3 if that happens.
3. *Tool form UI* (`f5c92500f90`, `8c3859fcd2d`, `da8d4a5c75e`, `d89de270820`, `497a6122fa5`): `ToolFormJobCount.vue`, `jobCount.ts`, the Run tooltip, and E2E.

**Option C — B plus a client cleanup PR**
Pull the `ToolForm.vue` stale-build-response guard (`buildRequestId`) and the removal of the dead `v-slot:footer` Run button into their own small client PR, landing before B.3. `baseline_refactor.md` notes they are tangled with the job-count wiring in one commit. Splitting them means hand-splitting that commit. The guard fixes a real race, since out-of-order build responses could already overwrite newer form state on dev, so it can be justified on its own.

**Option D — single PR (as is)**
The PR text should call out the `meta.py` refactor and the 404 change (an open question in the debrief).

## Scopes considered

### 1. As implemented
The `/api/tools/{id}/build` response gains `job_expansion` (`job_count`/`reason`/per-input counts), computed without loading HDAs. The tool form shows "This will run N jobs." above Run, with a breakdown and warnings for an empty collection, a size or structure mismatch, and remap with more than one job. The branch also carries a behavior-preserving `meta.py` refactor shared by the sync, async, validate and count paths, plus the unknown-id 404 fix.

| Pros | Cons |
|---|---|
| <ul><li>Complete feature: server, client, API, unit, vitest and E2E tests.</li><li>Classifier is shared with real expansion, so preview and execution agree by construction (tests use `expand_meta_parameters` as an oracle).</li><li>Refactor dedups three near-copy expansion paths, including dev's newer `validate_matched_batch_lengths`.</li><li>Cleanly independent of the `issue_20657` branch.</li></ul> | <ul><li>Warnings are advisory only. Run stays enabled for requests the server will reject.</li><li>Labels for inputs in sections and repeats are bare in the notice text.</li><li>About 1.3k changed lines in one branch, a large single review.</li></ul> |

### 2. Modest expansion — act on the preview + qualified labels (recommended)
Scope 1, plus: `runButtonDisabled` (or the tooltip) also considers the server preview. It disables on `batch_mismatch`, on `job_count === 0`, and on remap with more than one job, and the tooltip explains why. `reason: "unknown"` and `"inputs_not_ready"` never block. `batchInputLabel` resolves section and repeat parents into "Section › Input" / "Repeat 2 › Input".

| Pros | Cons |
|---|---|
| <ul><li>Closes the open question both debriefs raised ("Run stays enabled on empty/mismatch — disable?").</li><li>Turns a passive warning into the guard reviewers will likely ask for. The server already refuses these requests, so no valid submission is lost.</li><li>Both changes are in files the branch owns (`ToolForm.vue`, `jobCount.ts`), so they are small and easy to cover in vitest.</li><li>Labels fix polish candidate 2 from the original live check.</li></ul> | <ul><li>Server preview mistakes would now block submission instead of only warning. This is mitigated by the oracle tests and by blocking only on definite reasons.</li><li>Empty-collection submission behavior on dev should be confirmed: a 0-job run vs an error. If dev quietly runs 0 jobs, disabling Run is still the right UX, but the tooltip wording needs care.</li><li>The E2E test needs a mismatch step, or vitest needs to cover the disable path.</li></ul> |

<details>
The client already disables Run through `hasConfigOrValErrors` when it detects a mismatch at a field itself. The `jobExpansion` computed even suppresses the server notice in that case. Extending the same gate to server-only mismatches, such as structure mismatches between linked nested collections that the client can't see, follows that existing pattern and needs no new mechanism. Remap with more than one job is rejected by `_ensure_expansion_is_valid`, so disabling Run there is equally safe.
</details>

### 3. Larger expansion — count for the request/async (nested) API path
`summarize_meta_expansion` handles flat, legacy tool-form requests only. Generalizing it to `RequestInternalToolState` would allow a dry-run or preview for `/api/jobs` tool requests.

| Pros | Cons |
|---|---|
| <ul><li>The shared classifier already supports `_is_async_batch`, so the extension is mostly wiring.</li></ul> | <ul><li>No consumer exists. The tool form posts flat state to `build`. Per memory "Hunt for an existing consumer", an API without a caller is a liability.</li><li>Needs a new endpoint or field design, which is a separate PR.</li></ul> |

### 4. Larger expansion — performance guard for multiple linked nested collections
`match_collections` walks full structures (N+1) on every build when two or more linked collections are batched. A follow-up was flagged in the original review.

| Pros | Cons |
|---|---|
| <ul><li>Bounds build latency on large linked nested batches.</li></ul> | <ul><li>Only that case is affected, and it is the same walk execution already does.</li><li>Needs an SQL shape comparison, a non-trivial new model query.</li><li>Better as a measured follow-up.</li></ul> |

### 5. Larger expansion — job count on the workflow run form
Show the number of jobs or invocations for batched workflow inputs.

| Pros | Cons |
|---|---|
| <ul><li>Same user question ("how many will this run?") in a sibling form.</li></ul> | <ul><li>Different expansion code (`expand_workflow_inputs`, `product`), different form and different semantics (invocations × steps).</li><li>A separate feature.</li></ul> |

### 6. Re-merge with `issue_20657_input_processing_mode`
Undo the 2026-10-07 split into one PR with the processing hint, dropdown markers and job count.

| Pros | Cons |
|---|---|
| <ul><li>One coherent "explain batching" story for #19234 / #20657.</li></ul> | <ul><li>Both branches are already large. The split was deliberate, merges cleanly and lets either land first.</li><li>A re-merge doubles review size with no functional gain.</li></ul> |

### 7. Contraction — server-only (drop UI) or refactor-only
Ship only the `job_expansion` API (or only commits 1–3).

| Pros | Cons |
|---|---|
| <ul><li>Smaller, backend-only review.</li></ul> | <ul><li>An API field with no consumer. The user-visible value is the client notice.</li><li>Better handled as a PR decomposition (above) than a scope cut.</li></ul> |

### Not scope items (recorded elsewhere, unrelated to touched code)
- `_carry_selected_hdca` doesn't carry `map_over_type` on rerun. This is in the `issue_20657` branch area.
- NestTool on a mapped DCE may re-nest the whole outer list. This is an unrelated tool bug that deserves its own issue.
- Composed `localize()` fragments: the client has no interpolation convention.
- The client blocks a dataset + collection batch combination before the server's mismatch notice can show. This is pre-existing, and Scope 2 doesn't change it.
