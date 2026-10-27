# Scope evaluation: compare_runs

**Recommendation: modest expansion ("finish the abstractions").** Keep everything as implemented (plan modes 1–3, the `/comparisons` page, three entry points, Phase 5 items 1–5 and the parameter highlight). Also give the helpers that currently have only one consumer a real second consumer, and fix the related gaps in the code the branch touches:
1. move the ~12 hand-rolled `total_matches` header parses onto `totalMatches`;
2. move `useMappingJobs` (`Markdown/Sections/Elements/handlesMappingJobs.ts`) onto `useExecutionJobs`;
3. route `serialize_metadata(included=)` through `DatasetAssociationSerializer` so `GET /api/datasets/{id}?keys=metadata_<name>` returns that element (it is silently ignored today);
4. add the ~5-line `versions` filter to `output_runs` so modes 1 and 2 match;
5. add the one-prop "Other runs of this tool" entry on DatasetDetails (`include-other-runs-link` on the `JobInformation` at `DatasetDetails.vue:120`).

That adds roughly 150–250 changed lines, mostly in refactors that sit outside the comparison feature, and it turns three helpers into pieces that can land on their own. The deferred items are listed below as considered scopes, not recommended: graph run-count badges conflict with open #24307, subworkflow inner-step mode 1 has no identity design, the tool-form previous-runs panel is waiting on John, the editor entry point for #10039 and the #24174 rerun column depend on other work, and multi-dataset list cells (Q7) and output-link highlighting (Q19) change cell semantics.

## Possible Decompositions

**Size.** Counts exclude the generated `schema.ts`. Each count is lines added plus lines deleted, "code / tests":
- Python: 1,973 / —
- client: 3,528 / —
- tests: — / 4,719
- total: about 10.2k changed lines across 35 commits.

These are layouts for John to choose from, not a recommendation.

**Pieces** (SHA, then code/test lines):

| Id | Piece | Commits | Code / tests | Consumer status | Open-PR overlap |
|---|---|---|---|---|---|
| P0 | Baseline tests | `381de85c4e6` B1 job fields, `55d08553c40` B2 popover, `3243191f273` B3 metadata, `bc8b0ba9049` B4 job IO names, `6128074d3e9` B5 ToolExecutionJobs | 0 / 234 | Stands alone (tests only, pass on dev); each baseline can also travel with its piece: B1+B3+B4 backend, B2 → H1, B5 → H3 | B1 in `test_jobs.py` (#24288) |
| H1 | `ItemPopoverLink` + DOM-id collision fix | `1e22a04a403` | 230 / 173 | Stands alone, weakly: fixes the `storage-run-item-dataset-<id>` collision; `DatasetPopoverLink` becomes a wrapper and `StorageOperationRunView` is unchanged | — |
| H2 | `downloadBlob` | `34d645f4cc1` | 38 / 24 | Stands alone: replaces the copies in `CitationsList.vue` and `workbooks.ts` | — |
| H3 | `useExecutionJobs` + batch pager in `ToolExecutionJobs` | `fe9be463408` | 178 / 64 | Stands alone for tool requests (existing callers unchanged); the batch path's only user is comparisons until `useMappingJobs` moves onto it (expansion 2) | — |
| H4 | `totalMatches` in `@/api` | `bcdce7b6a85` | 5 / 9 | Comparisons only until the ~12 copies migrate (expansion 1) | — |
| H5 | GTable `detailsShowing` | `26c805bc60d` | 1 / 22 | Comparisons only (no other `<GTable>` user toggles details) | — |
| H6 | `JobParametersDiff` / `diffJobParameters` | `eb88b376078` | 220 / 183 | Comparisons only (row-detail highlight and diff panel) | — |
| H7 | Route `meta.keepMountedOnQueryChange` | `d3b877f7b56` | 27 / 30 | Comparisons only: `/galaxyai` is still special-cased by its path prefix in `routerViewKey.ts`, so `/comparisons` is the flag's only user | `Analysis.vue` (#24307) |
| H8 | NavigatesGalaxy graph helpers | part of `0fa14c972ac` | ~30 + framework / ~36 | Stands alone: `test_workflow_invocation_graph.py` adopts them | invocation selenium area (#24307 touches nearby tests) |
| B-core | Backend core + mode 1: metadata `included=`, batched access helpers + DI registration, models/columns, `step_runs`, inaccessible cells, `versions` filter | `3b63e3ddade`, `38d75caa91d`, `ee83bc5fb05`, `12d8eaed487`, `acc62472ddb`, `b9ddb1634a3` | 1,361 / 864 | The API is the consumer; `included=` gets a non-comparison consumer with expansion 3; access helpers are comparison-only | — (new files; `app/__init__.py` one line) |
| B-23 | Modes 2 and 3 backend: `output_runs`, `tool_runs`, output-label facet | `bb833efb9c9`, `f1a252c5440`, `9f29c45bb05` | 737 / 618 | API consumer | — |
| B-job | Job API: `tool_version`, `copied_from_job_id` on index, `tool_version` filter | `60fc6e0e2bc` | 27 / 22 | Stands alone: `JobInformation.vue` drops its `"tool_version" in job` cast; #24288's jobs panel could show reuse | `managers/jobs.py`, `schema.py`, `api/jobs.py`, `test_jobs.py` (#24288) |
| C-core | Table + cells, `/comparisons` page (all three kinds), All runs tab, entry points | `cc333981485`, `58acb86fc7d`, `13797b0e1aa`, `927f262229a` | 2,056 / 1,754 | Feature | `router.js`, `navigation.yml`, `WorkflowInvocationStep.vue` (#24307) |
| C-polish | Phase 5: highlight, two-row diff, CSV/TSV, state/version filters, batch pager in detail, diff-visible, parameter highlight | `08c85bd8676`, `4ec5a745041`, `636f9c6cb98`, `a81f493bf91`, `a3abda3672c`, `8ff9c5994f5`, `ec9bf190bc0` | 993 / 674 | Feature; it is the only comparison consumer of H2, H3 (batch) and H6 | — |
| E2E | Playwright/Selenium test | rest of `0fa14c972ac` | ~46 / ~154 | Exercises C-core and C-polish (diff) and mode 3 | `navigation.yml` (#24307) |

**Mechanics that apply to every option:**
- Each backend PR needs its own `make update-client-api-schema` hunk. Regenerate each one cleanly: the current regen commit `978597e315f` also removes about 692 lines, including pages-PDF operations that have nothing to do with this branch.
- `client/src/utils/navigation/schema.ts` is hand-edited because it is stale on dev (Q16). A dev-wide regeneration PR before these would avoid that.
- `comparisonQuery.ts` and `ComparisonView` handle all three kinds in one commit each. Any per-mode client split therefore means cutting `cc333981485` and `58acb86fc7d` apart.

### Option A: two layers (API, then UI)

1. **P0 + B-core + B-23 + B-job**: the whole read-only API, about 2.1k code and 1.6k test lines. It stands alone as an API, and the API tests cover all three modes.
2. **H1–H8 + C-core + C-polish + E2E**: the whole client.

It is the simplest review boundary, but the second PR is still about 3.8k code lines.

### Option B: standalone helpers first, then API, then core UI, then polish

1. Independent small PRs in any order:
   - P0;
   - H1;
   - H2;
   - H3, with expansion 2 so the batch path has a consumer;
   - H4, with expansion 1;
   - B-job;
   - H8;
   - `included=` with expansion 3, pulled out of B-core.
2. **B-core + B-23**: the API.
3. **C-core + H5 + H7 + E2E** (the E2E without its diff step): the feature end to end, with the entry points.
4. **C-polish + H6 + the E2E diff step**: the two-row diff, export, filters, highlights and parameter diff.

This produces the most PRs, each small and with a consumer. H6 is held back until step 4 because it has no consumer before then. H2 and H3 can land in step 1 only because each already has a dev consumer.

### Option C: vertical by mode

1. Helpers, as in Option B step 1.
2. **Mode 1 end to end**: B-core, plus H5 and H7, plus the table, plus the All runs tab.
   - Either `/comparisons` accepts `kind=step_runs` only, or the tab's "View all in a page" link is dropped.
   - The E2E's step-tab path goes here.
3. **Modes 2 and 3**: B-23, the other two `/comparisons` kinds, and both entry points ("Compare outputs" and "Other runs of this tool", which needs B-job).
4. **C-polish + H6**.

Each PR is a feature a reviewer can try in the browser. The cost is rework: `cc333981485`, `58acb86fc7d` and `0fa14c972ac` all have to be cut by mode.

### Option D: conflict-aware ordering

1. **Pieces no open PR touches**: P0 (without B1), H1, H2, H3, H4, H5, H6, B-core and B-23.
   - This is the entire backend API, since its files are new.
   - The table components can go too if no route uses them yet.
2. **After #24307 merges**: H7, the `/comparisons` route, the All runs tab, `navigation.yml`, the E2E and C-polish.
   - Rows then get `?step_label=` deep links that work.
3. **After #24288 merges** (or rebased onto it): B-job with B1, and the job-page "Other runs" entry.

This keeps the review queue moving while #24307 and #24288 are open. The order follows when other PRs merge, not how the feature is built up.

### Option E: as is, with the baselines split out

1. **P0** as its own PR, per the workhorse baseline convention.
2. Everything else as one PR, about 10k lines.

Reviewers get the most context in one place, but a 10k-line Galaxy PR is unusually large.

## Scopes considered

### 1. As implemented

All three modes, three GET endpoints, the `/comparisons` page, three entry points, Phase 5 items 1–5, and the parameter highlight against the viewed run. Phase 5 items 6–9 are deferred.

| Pros | Cons |
|---|---|
| <ul><li>Covers the plan completely, plus the polish John asked for</li><li>One access-checked cell path for all modes</li><li>Statement count per page is pinned flat</li><li>Helpers are generalised as it goes (H1–H8)</li></ul> | <ul><li>Several helpers ship with one consumer (H4, the H3 batch path, `included=`, H5, H6, H7), which is what Galaxy reviewers object to</li><li>Mode 2 has no `versions` filter, although mode 1 does</li><li>DatasetDetails is the most-visited job surface and has no entry point</li></ul> |

### 2. Recommended: as implemented + "finish the abstractions"

The five items in the top-line. Each one is a refactor or bug fix in code the branch already touches. None of them has an open design question.

| Pros | Cons |
|---|---|
| <ul><li>H3 and H4 become refactors that stand alone, and `included=` fixes a real API bug (`?keys=metadata_x` silently ignored)</li><li>Modes 1 and 2 get the same filters</li><li>The DatasetDetails entry is one prop plus a test, reusing the existing gate</li><li>Pieces fit Options B, C and D without extra work</li></ul> | <ul><li>Touches more released files: about 12 `total_matches` call sites, the Markdown mapping-jobs element and dataset serialization. More reviewers are pulled in.</li><li>The `?keys=metadata_<name>` behaviour change needs its own API test and baseline</li><li>Adds about 200 lines to an already large branch</li></ul> |

<details><summary>Notes on each item</summary>

1. **`totalMatches`.** The 12 header copies are in `HistoryDatasetPicker.vue`, `Grid/configs/invocations*.ts` (3), and `api/histories.ts` (3), `histories.archived.ts`, `pages.ts`, `visualizations.ts`, `datasets.ts` and `remoteFiles.ts`.
   - Some return `NaN`-safe `|| 0` and some don't. Migrating them all also makes that consistent.
2. **`useMappingJobs`** fetches `/api/jobs?implicit_collection_jobs_id=` itself. Phase 5's own note calls it a "future consumer".
3. **`?keys=metadata_<name>`.** `plan.md` documents that the key is ignored and only `keys=metadata` expands every element (`managers/datasets.py`, `DatasetAssociationSerializer.serialize` / `_prefixed_metadata`). `included=` was added so that this fix would be small (D11).
4. **`output_runs` `versions`.** Phase 5 implementation note: "about five more lines". It reuses `_page_invocations`.
5. **DatasetDetails.** `JobInformation` already takes `includeOtherRunsLink` and gates it on a registered user and a `tool_id`. `DatasetDetails.vue:120` renders `JobInformation` without the prop.

</details>

### 3. Contracted: mode 1 only

Ship only `step_runs` and the All runs tab, and drop modes 2 and 3, `/comparisons`, the job API changes and the Phase 5 polish.

| Pros | Cons |
|---|---|
| <ul><li>About a third of the size</li><li>Answers #10039's core question directly</li><li>Fewest open-PR overlaps</li></ul> | <ul><li>Throws away finished, tested work</li><li>The shared table and query base would have only one user, the "abstraction with no second consumer" problem in reverse</li><li>Goes against John's request for expanded scope</li><li>The same contraction is available as Option C step 2, without deleting anything</li></ul> |

### 4. Per-node run-count badges in the invocation graph (Phase 5 item 6)

A grouped-count endpoint (label → number of runs for the stored workflow) and a badge on each graph node that opens All runs.

| Pros | Cons |
|---|---|
| <ul><li>Makes the feature discoverable from the graph</li><li>One grouped query</li><li>Was in the plan's "Later" list</li></ul> | <ul><li>Edits `InvocationGraph.vue`, `useInvocationGraph.ts` and `WorkflowGraph.vue`, all of which open #24307 rewrites</li><li>Needs a new endpoint and design (count all versions, or only those carrying the label?)</li><li>Better as a follow-up after #24307</li></ul> |

### 5. Mode 1 for subworkflow inner steps (Phase 5 item 7)

Address inner steps by a label path (`outer/inner`) through `WorkflowInvocationToSubworkflowInvocationAssociation`.

| Pros | Cons |
|---|---|
| <ul><li>Nested workflows are common in IWC-style workflows</li><li>Today a subworkflow step only links to its subworkflow invocation</li></ul> | <ul><li>No identity design: across outer versions the subworkflow can be swapped, re-imported or relabelled, and it's unclear whether the inner or outer label anchors identity</li><li>Needs a design pass with John before code</li><li>Medium–large effort</li></ul> |

### 6. Tool-form "previous runs" panel (Phase 5 item 9, plan question 2)

Show the last few mode 3 rows for the open tool on the tool form, linking to `/comparisons?kind=tool_runs`.

| Pros | Cons |
|---|---|
| <ul><li>The most natural mode 3 entry point; the job page needs a job first</li><li>Fully reuses `tool_runs` and the table</li></ul> | <ul><li>Waiting on John (plan question 2)</li><li>The tool form is a hot, heavily used surface that needs UX review</li><li>Adds a request per tool-form open unless it's lazy</li></ul> |

### 7. Workflow-editor entry point (#10039)

Add "Previous runs" to the editor's step panel, opening mode 1 for the selected labelled step. This is exactly what #10039 asks for.

| Pros | Cons |
|---|---|
| <ul><li>Closes the oldest related issue on its own terms</li><li>The editor has the stored workflow id and step label, so it reuses `step_runs` and the table directly</li></ul> | <ul><li>The editor may be showing an unsaved label or version, which needs a defined behaviour</li><li>`WorkflowGraph.vue` is also edited by #24307</li><li>Another surface to review, so it fits better as a follow-up that cites #10039</li></ul> |

### 8. "Rerun of" column via #24174

Show rerun lineage in mode 1 and mode 2 rows.

| Pros | Cons |
|---|---|
| <ul><li>The plan's Context lists it</li><li>A rerun is exactly a new row</li></ul> | <ul><li>#24174 is an open issue with an unmerged branch and a migration</li><li>Can't land before it</li></ul> |

### 9. Multi-dataset input cells (Q7)

Show all N datasets of a `multiple="true"` input as a list cell instead of the first one.

| Pros | Cons |
|---|---|
| <ul><li>The current cell silently hides inputs</li><li>Possibly a correctness issue for comparing runs</li></ul> | <ul><li>Adds a list variant to the `Cell` union and to every renderer, the diff, export and highlight</li><li>Open design question for John</li></ul> |

Lean: do it if John confirms Q7, since a cell that silently drops data is closer to a bug than to polish.

### 10. Output-link highlight and diff by name/hid (Q19)

Today output links are never marked changed, because every run makes new HDAs. Compare them by name or extension instead.

| Pros | Cons |
|---|---|
| <ul><li>Makes the change highlight useful on output columns</li></ul> | <ul><li>Name equality says little about content</li><li>Hashes are not populated generally</li><li>Open semantics (Q19)</li></ul> |

### 11. Per-workflow Runs page with a version picker (Phase 5 item 8)

| Pros | Cons |
|---|---|
| <ul><li>Was in the plan's "Later" list</li></ul> | <ul><li>Mostly duplicates `/comparisons?kind=output_runs`, especially with expansion 4</li><li>Skip</li></ul> |

### 12. Mode 3 rows per ToolRequest (Q1)

Group mode 3 rows by `Job.tool_request_id`, which since PR 21842 is set for every UI submission.

| Pros | Cons |
|---|---|
| <ul><li>Matches how users submit tools from the UI</li></ul> | <ul><li>Workflow jobs and legacy `/api/tools` jobs have no ToolRequest, so a Job/ICJ fallback is needed anyway</li><li>The as-implemented unit covers every job</li><li>Keep it as implemented unless John prefers this</li></ul> |

### 13. Smaller follow-ups the reviews raised

| Item | Lean |
|---|---|
| Server-side repeat header row in `summarize_job_parameters`, which would end the positional-pairing limit in `diffJobParameters` | Follow-up. It changes released display code shared with `JobParameters`. |
| Migrate `test_histories_list.py` to `assert_current_url_contains` | Cheap; can go with H8. |
| Fold `datasets_are_public` / `dataset_access_mapping` onto `accessible_dataset_ids` | Don't. The fix pass kept them because of the risk to released behaviour. Parity tests pin all four. |
| Mode 3 display-pref key keeps the Tool Shed version | Small client tweak; John's call (phase 4 Q4). |
| `client/src/utils/navigation/schema.ts` dev-wide regeneration | A separate dev PR, independent of this branch. |

<details><summary>Checked and not a scope item</summary>

- `plan.md` says `/api/invocations` counts `total_matches` before the security filter. For non-admins, the service forces `user_id`, and the owner join comes before `get_count`. The remaining post-filter (`check_security`) only drops items in rare cases, so the count can at most overcount slightly. This is not worth expanding scope for.
- #24305 (duplicate output labels): dev already rejects them on save. The branch flags a duplicate column, and only unit tests can reach that path. No expansion is needed.

</details>

> Coordinator note: the "692 removed lines" in the schema regeneration are a diff-algorithm artefact. `git diff --diff-algorithm=histogram fd43a3c6ce8 HEAD -- client/packages/api-client/src/schema/schema.ts` is purely additive (+804), and the pages-PDF operations are still present.
