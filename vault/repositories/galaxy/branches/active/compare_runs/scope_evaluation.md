# Scope evaluation (hardening iteration 3)

**Recommendation: no scope change. Hold scope as implemented: no third expansion, no contraction, and the three deferred items stay deferred.** `compare_runs` @ `565950820cd` changes ~11.8k non-generated lines over `fd43a3c6ce8` (server 2.4k src / 2.4k test, client 3.8k src / 3.2k test). It already covers all of plan.md, its Phase 5 "Later" diff, two rounds of expansion and five entry points. None of the deferred items is small, self-contained *and* fixes a real gap. There are two in-place touch-ups, neither of which is a re-scope. (a) A boundary fix in already-built code: on a subworkflow invocation's own page (the standalone route never sets `isSubworkflow`, so step cards render there), "All runs" silently resolves to that subworkflow build's hidden StoredWorkflow. Disable or label the tab there (≤60 lines). (b) A placement call: the consumer-less `GET /api/jobs?tool_version=` filter belongs in the job-fields prep PR (P1), not the feature path. Dropping it is John's option. The real decision is decomposition, below.

The caller set the bar for this iteration: after two expansions, a new expansion must be small, self-contained and fix a real gap. That overrides the process doc's default lean toward expansion. Contraction was weighed seriously, mainly the Phase 5 polish (~1.9k lines). It is kept in the branch because John asked for polish, and it is a clean PR boundary (see the decompositions).

## Possible Decompositions

Sizes are at the tip (`git diff --numstat fd43a3c6ce8 565950820cd`, histogram), with both generated `schema.ts` files excluded. `09c704d08b5` (+1356/−995) rewrites the earlier server commits, so per-commit sums overstate the server. Commit lists say *which* commits; the line counts come from the tip.

### Building blocks

**Prep PRs that can land on `dev` alone** (each has a dev consumer or fixes a dev bug):

| Id | Commits | ~Lines (src/test) | Standalone because | Notes |
|----|---------|------------------|--------------------|-------|
| P1 Job response fields | `5d47beec7ae` (baseline), `df7c6b15ccc`, the `toolVersion` hunk of `3f1a2f8d6b0` in `JobInformation.vue`, later `3eb1f3356a6` | ~200 (40/160) | **Released display bug.** `tool_version` isn't declared on any job response model, so `JobInformation`'s "Tool Version" row never renders. The baseline pins show-keys without it. Confirmed on release_25.1: no `tool_version` on `JobBaseModel`, `JobSummary` or `schema/jobs.py`, and `JobInformation` reads it the same way. | Could retarget to a release branch (`tool_version` part only). Textual conflict with #24288 in `JobIndexQueryPayload`, `index_query` filters and the `/api/jobs` params. `3eb1f3356a6` (reused badge) needs P4. |
| P2 Metadata keys | `267dfae1fd1`, `b40ff056bbd` (baselines), `54789e9ae54` | ~80 (30/50) | Additive API: `?keys=metadata_<name>` returns one element where it used to be ignored. | The server PR needs `serialize_metadata(included=)`. |
| P3 ItemPopoverLink | `3d9fb09af62` (baseline), `f8d6709effe` | ~430 (230/200) | Fixes the DOM id collision in `DatasetPopoverLink` (storage runs). | Touches `DatasetPopoverLink.test.ts`, as do #24300 and #24038. |
| P4 Execution jobs | `89d1467570b`, `ded9e0313e1` (baselines), `958574ce599`, `5091398f33f` | ~480 (250/230) | `useMappingJobs` and `ToolExecutionJobs` share one `useExecutionJobs`. | `958574ce599` is a **small UI behaviour change** (batch job paging in ToolExecutionJobs), not a pure refactor. |
| P5 Client helpers | `087b45ddf2c` (`totalMatches`), `578d2a22249` (`downloadBlob`) | ~140 (100/35) | ~12 and 2 existing dev callers. | No shared files with each other; split them or keep them together. |
| P6 Test infra | `0aa158e3d10`, `f26c4925072` | ~110 (25/85) | Test-only moves with existing dev callers. | `navigates_galaxy.py` and `framework.py` are touched by many open [26.2] E2E PRs (#24451, #24439, #24331…); expect trivial append conflicts. Can also fold into the first PR that uses them. |

**Not standalone** (no dev consumer; fold them into the feature):

- `bc01e138834` (batched access checks, 108) → server.
- `07f49a91098` (GTable `detailsShowing`, 23) → client.
- `ca72a8e41d9` (shared versionless tool-id spec) → server and client.
- `e15ba92a4e5` (`reuseOnQueryChange` route key, 57) duplicates #24307's inline rule. It lands with `/comparisons`, after #24307 (then drop it and just set the meta), or #24307 rebases onto it.

`f2f48b59ad5` (io-association-name baseline, 48) pins what mode 3 normalisation relies on. It can go with P1 or ahead of the server PR.

**Feature layers:**

| Id | Commits | ~Lines (src/test) |
|----|---------|------------------|
| S Server: 3 endpoints, models, resolvers, access, regen | `bc01e138834`, `45e159ff18f`…`eb49f692c55` (21 commits), `09c704d08b5`, `cf22203a483` (regen), server half of `ca72a8e41d9` | ~4.2k (2.3k/1.9k) |
| C Client core: table, cells, `/comparisons`, filters, row detail, entry points, E2E | `07f49a91098`, `3a006340595`, `8ac6265193a`, `3f1a2f8d6b0` (minus the P1 hunk), `924465305a1`, `b22d2b84437`, `b1dc32b61e0`, `1b9b2132d4e`, `a095adf1809`, client half of `ca72a8e41d9`, `1971d95d4f9`, `1d60640b33b`, `0ca55fcb6a7`, `63e5fbd48a8`, `071a9d40c6c`, `e15ba92a4e5`, `3cd60c9cb57`, `565950820cd` | ~4.2k (≈2.1k/2.1k) |
| D Polish: two-run diff, CSV/TSV export, changed-cell highlights, parameter highlight | `c942a6449a1` (JobParametersDiff), `a87aab75775`, `bbea06b4860`, `fed736a0726`, `388b75eab6c`, `1e9f86e5578` | ~1.9k (≈1.05k/0.85k): 1.3k in new files plus ~0.6k of hunks in ComparisonTable/View/StepRunsTab/RowDetail |

Dependencies:
- S needs P2.
- C needs S, P3, P4 and P5 (`totalMatches`).
- D needs C, plus P5 (`downloadBlob`).
- The E2E needs P6.
- `3eb1f3356a6` needs P1 and P4.

### Option A: layered, many small PRs

P1–P6 in any order (P1 as early as possible, or retargeted to a release) → S → C → D.

Six prep PRs of 80–480 lines, then three feature PRs of ~4.2k / ~4.2k / ~1.9k. Every PR is reviewable on its own. S lands as API-only, which reviewers can try with curl. Cost: S and C each stay above 4k.

### Option B: prep bundle, then one feature PR, then polish

1. One "prep for run comparisons" PR: P2–P6, ~1.2k. P1 goes separately, since it is a bug fix and possibly release-targeted.
2. S + C (~8.4k).
3. D (~1.9k).

Fewest PRs while still keeping the polish (the plan's "Later" item) separable. The 8.4k feature PR is large, but it is one coherent user-visible feature.

### Option C: vertical by mode

Prep (as in A or B) → mode 1 end to end → mode 2 → mode 3 → D.

- **Mode 1:** the `step_runs` resolver, shared models/cells/access, ComparisonTable, the All runs tab, `/comparisons`, and the editor link. ~6k, most of S and C.
- **Mode 2:** `output_runs` plus the Compare outputs entry. ~0.8k.
- **Mode 3:** `tool_runs` plus the job and dataset entries, plus `tool_versions` facets. ~0.9k.

Each PR is a complete feature reviewers can click through. Mode 1 is still ~6k. **This is a re-cut, not a cherry-pick.** `09c704d08b5` decomposed the manager around a submission record shared by all modes, and 17 of the 27 API tests are mode 1. Expect roughly a day of path-level re-splitting plus re-running the tests at each cut.

### Option D: two PRs

P1 alone, then everything else (~11.6k) as one PR, with the baselines first in the history. The least overhead, but the hardest review; Galaxy reviewers rarely take 10k+ at once.

### Overlaps with open PRs (any option)

- **#24288 (jobs panel, open):**
  - It moves `get_count` from `managers/workflows.py` to `managers/base.py`. `comparisons.py:53` imports it from `managers.workflows`. That still works at runtime, but mypy fails because mypy.ini sets `no_implicit_reexport = True` globally, and no `galaxy.managers` section overrides it. Fix: a one-line import from `managers.base`.
  - P1 also conflicts textually in `schema.py` (`JobIndexQueryPayload`), `managers/jobs.py` (`index_query` filter block), `api/jobs.py` (index params) and `test_jobs.py`.
  - Whichever lands second rebases.
- **#24307 (invocation URLs, open):**
  - Both touch `Analysis.vue` (same router-view key lines), `router.js` and `navigation.yml`.
  - It rewrites `WorkflowInvocationStep.vue`'s GTabs into a named-tab adapter, which is where `StepAllRunsTab` mounts. The All runs tab then needs a `step_tab` name.
  - Mode 1 row links already emit its `?step_label=` contract, which is ignored until it lands.
  - Landing C after #24307 is the cleaner order.
- **#24300 and #24038:** both touch `DatasetPopoverLink.test.ts` (P3).
- **The [26.2] E2E PRs:** they touch `navigates_galaxy.py` and `selenium/framework.py` (P6). Append-site conflicts only.

## Scopes considered

### 1. As implemented (recommended; touch-ups 2 and 3 are in place, not re-scopes)

Modes 1–3 behind three GET endpoints, one shared table, `/comparisons`, and five entry points: step card, job page, DatasetDetails, stored-workflow invocations and the workflow editor. It also includes the Phase 5 polish and the two prior expansions: the "finish the abstractions" second consumers, and the hardening-2 skipped-output, editor-link and reused-badge items.

| Pros | Cons |
|------|------|
| <ul><li>Covers every plan.md mode and entry point, plus #10039's editor ask.</li><li>Every new shared helper (ItemPopoverLink, `useExecutionJobs`, `totalMatches`, `downloadBlob`, `serialize_metadata(included=)`) has a second, dev consumer.</li><li>Missing-reason vocabulary is complete (`skipped`, `not_in_version`, `inaccessible`…).</li></ul> | <ul><li>~11.8k lines, so it must be split for review (see above).</li><li>It depends on two open PRs for polish: the #24307 deep link and the `get_count` move in #24288.</li><li>Some speculative surface: the `/api/jobs` `tool_version` filter has no caller.</li></ul> |

### 2. Boundary fix in built code: All runs on a subworkflow's own invocation page

Each embedded subworkflow build gets its own hidden StoredWorkflow (`__build_embedded_subworkflow`, `hidden=True`). The standalone `/workflows/invocations/:invocationId` route never sets `isSubworkflow`, so a subworkflow invocation's own page (which comparison rows link to as "subworkflow run") renders the graph and step cards. There, `StepAllRunsTab` resolves `invocation.workflow_id` with `instance` to that hidden StoredWorkflow. So "All runs" lists only runs of that one subworkflow build. The fix is to disable the tab there ("Steps inside a subworkflow can't be compared across versions yet") or label it.

| Pros | Cons |
|------|------|
| <ul><li>Small (≈30–60 lines plus a vitest) and self-contained.</li><li>Fixes a misleading result the branch's own links lead users to.</li><li>Makes the deferred "subworkflow inner steps" boundary explicit, not silent.</li></ul> | <ul><li>How narrow it gets is unverified live: if an editor save reuses the inner Workflow, several outer versions share one hidden StoredWorkflow.</li><li>The client needs a new signal that the invocation is a subworkflow's, e.g. `StoredWorkflow.hidden` echoed by the server, or the parent association. No caller sets `isSubworkflow` today.</li></ul> |

### 3. Placement: move `GET /api/jobs?tool_version=` into P1 (dropping it is John's option)

`df7c6b15ccc` adds a `tool_versions` filter to `JobIndexQueryPayload`, `index_query` and the `/api/jobs` params. Mode 3 runs its own query and doesn't use it. Nothing in the branch does. Hardening 2 kept it in anticipation of #24288's filters.

| Pros | Cons |
|------|------|
| <ul><li>Keeping it in P1, as `df7c6b15ccc` already does, keeps the feature PRs free of `/api/jobs` changes.</li><li>Dropping it, John's call, would remove infrastructure with no caller: under the "unused infrastructure" rule, no consumer was found in `client/src` or the comparison resolvers. It would also remove most of P1's textual conflict with #24288, and leave P1 a pure released-bug fix that can be retargeted.</li></ul> | <ul><li>If kept, P1 is a bug fix plus a new filter, so it is less clean to retarget to a release.</li><li>If dropped, it's a natural fit for #24288's JobsFilters, and re-adding it there later costs ~25 lines plus its API test.</li></ul> |

### 4. Contraction: defer the Phase 5 polish (diff, export, highlights, parameter highlight)

Drop D from the branch: `c942a6449a1`, `a87aab75775`, `bbea06b4860`, `fed736a0726`, `388b75eab6c` and `1e9f86e5578`, ~1.9k lines. plan.md lists "a side-by-side diff of two rows" under **Later**. Filters and the batch pager stay.

| Pros | Cons |
|------|------|
| <ul><li>Cuts ~16% of the branch and ~1k src lines. The core value (seeing runs side by side) is intact without it.</li><li>`JobParametersDiff` has only one consumer.</li></ul> | <ul><li>John explicitly asked for expanded scope and polish.</li><li>The work is done, reviewed and tested.</li><li>It's a clean layer already, so a separate PR (Option A/B "D") gets the same review benefit without dropping it.</li></ul> |

### 5. Contraction: drop mode 3 (tool runs) or mode 2 (workflow outputs)

Ship only mode 1, or modes 1 and 2.

| Pros | Cons |
|------|------|
| <ul><li>Mode 3 is ~0.9k lines plus its entry points and P1 coupling. Mode 2 is ~0.8k.</li></ul> | <ul><li>Mode 3 answers the plan's sharpest gap: "for tools there is no list of past runs at all".</li><li>Mode 2 is the #10039 ask.</li><li>Both share nearly all infrastructure with mode 1, so the marginal cost is low. Better as vertical PRs (Option C) than as cuts.</li></ul> |

### 6. Deferred: graph run-count badges

A per-node "N runs" badge in the invocation graph, linking to All runs.

| Pros | Cons |
|------|------|
| <ul><li>Discoverability: users see which steps have history without opening cards.</li></ul> | <ul><li>Not small. It needs an aggregate count endpoint (per step label, per stored workflow) and graph node rendering.</li><li>Conflicts with #24307, which rewrites `InvocationGraph.vue`, `WorkflowInvocationSteps.vue` and `useInvocationGraph`.</li><li>Follow-up after #24307.</li></ul> |

### 7. Deferred: mode 1 for steps inside subworkflows

Compare an inner step across outer-workflow versions, reached through `WorkflowInvocationToSubworkflowInvocationAssociation`.

| Pros | Cons |
|------|------|
| <ul><li>Real gap for subworkflow-heavy workflows (see scope 2).</li></ul> | <ul><li>There is no design yet for cross-version identity: an outer-label/inner-label path, nested subworkflows, or an inner workflow swapped wholesale.</li><li>It needs new resolver joins and tests.</li><li>Scope 2 is the cheap boundary until it exists.</li></ul> |

### 8. Deferred: tool-form "previous runs" panel (design question 3)

A collapsible panel on the tool form that lists the user's recent runs of the tool, via `tool_runs`, with a link to `/comparisons`.

| Pros | Cons |
|------|------|
| <ul><li>The most natural mode 3 entry. The API and table already exist, so it's ~150–300 lines.</li></ul> | <ul><li>Tool-form layout is high-traffic, opinionated UI. It fetches on every form open unless lazy.</li><li>Awaiting John's call (Q3), so it shouldn't be taken unilaterally.</li></ul> |

### 9. Considered expansion: "Compare outputs" on the invocation page (mode 2 entry)

A button in the invocation header or overview, next to the stored-workflow invocations list entry.

| Pros | Cons |
|------|------|
| <ul><li>~20–40 lines.</li><li>It's where users are when they want to compare.</li></ul> | <ul><li>#24307 heavily rewrites `WorkflowInvocationState`/`Overview`, so it would conflict.</li><li>Mode 2 is already reachable from the workflow's invocation list.</li><li>A follow-up after #24307.</li></ul> |

### 10. Considered expansion: "rerun of" column (#24174) and a named All runs tab for #24307

Show the rerun lineage on mode 1/2 rows, and give All runs a `step_tab` name so row links can open it.

| Pros | Cons |
|------|------|
| <ul><li>Both are small once their dependencies land.</li></ul> | <ul><li>#24174 is an open issue with no merged model change.</li><li>#24307 is unmerged.</li><li>Both are follow-ups to file after their parents land, not scope for this branch.</li></ul> |

<details><summary>Reviewer-raised items not promoted to scopes</summary>

- **phase_5_review_fixes:** a server-side repeat header row in `summarize_job_parameters` would end the parameter-diff repeat limit. It changes released display code shared with `JobParameters`, so it's a separate PR if wanted.
- **phase_4_implementation Q4:** mode 3 display prefs are keyed by the full Tool Shed id, so each version gets its own prefs. A UX nit, not scope.
- **phase_4_review:** the Other runs gate rides on `showHeader`; a dedicated prop would be clearer. This is code quality, not scope.
- **phase_4_review_fixes:** migrating `test_histories_list.py` to `assert_current_url_contains` is unrelated.
- **phase_2_review_fixes:** `cancelling` → `no_output`, and `encode_all_ids` on the library upload response. Minor, not scope.
- **implementation_plan "Later":** a per-workflow Runs page with a version picker. `/comparisons?kind=output_runs` with the version filter already covers most of it.

</details>
