# Scope evaluation (hardening 2, after re-scope)

**Recommendation: a small expansion on top of the branch as implemented.** Do three things, and nothing larger. (1) Reconcile the route-meta abstraction with #24307: commit `7cc7b38f2b7` adds `meta.keepMountedOnQueryChange` plus `routerViewKey.ts`, and #24307 adds the same rule inline in `Analysis.vue` as `meta.reuseOnQueryChange`. Use one name and one helper for both. (2) Show skipped outputs as `Missing(skipped)` in `output_runs` workflow outputs and skipped subworkflow steps too, so all three modes agree. The implementer sized this at one batched creating-job lookup; it is a known gap in code the branch wrote. (3) Add the workflow-editor entry point that #10039 actually asks for: in `NodeInspector`, a "Compare runs of this step" link to `/comparisons?kind=step_runs` for a labelled step of a saved stored workflow, hidden while `hasChanges` is set. Keep graph run-count badges, subworkflow inner-step mode 1, the tool-form panel, the rerun-lineage column, a second consumer for `accessible_dataset_ids`, and the #24305 save-path fix as follow-ups; each is written up below. For the job-index fields that have no caller yet, lean toward giving `copied_from_job_id` a dev caller (a "reused" mark in the batch pager, ~15 lines) and keeping the `tool_version` filter for #24288 (scope 8). Size: about 10.7k lines added and 0.3k removed, not counting generated `schema.ts` (+829). About 5.1k of those lines are tests. The diff spans 46 commits and 117 non-generated files.

## Possible Decompositions

This section is for John to choose from and doesn't recommend a split. Line counts are per-commit adds plus deletes without `schema.ts`, so they add up to more than the net diff because later commits edit earlier lines. "nt" means non-test lines.

**Commit groups**

| Group | Commits | Lines (nt) | Contents |
|---|---|---|---|
| A baselines | `9886e62` `b33c14b` `0135f97` `5f1ddb3` `f4fb17d` `2d6394f` `3de6b98` | 335 (0) | 7 "Baseline tests" commits, all of them tests |
| B server helpers | `69c011e` `b1b1a25` `58dae6b` | 196 (92) | `keys=metadata_<name>`, `accessible_dataset_ids` / `accessible_ids`, job `tool_version`/`copied_from_job_id` + `/api/jobs?tool_version=` |
| C models + mode 1 API | `cae3d8d` `b4e31b9` | 1998 (1257) | schema, column alignment, cell builder, service/router, `step_runs` |
| D mode 2 API | `259ce6e` `8fe474b` | 779 (447) | `output_runs`, output-label facet |
| E mode 3 API | `279d07f` | 602 (311) | `tool_runs` |
| F API follow-ons | `dec79a3` `ce22abb` `d60bb48` `baa284d` `70b7112` `008e81e` `6238e45` `baaa646` `f73f003` | 901 (310) | version filters, test challenges, input-step cells, `dataset_list`, skipped, declared inputs, invoked versions; several touch 2–3 modes |
| regen | `4e0494d` | generated | the only `schema.ts` regen |
| G1 client helpers | `38d74bd` `b6de269` `9d74094` `1e1a2d9` | 563 (335) | `ItemPopoverLink`, `totalMatches` (~12 callers), GTable `detailsShowing`, `utils/download` (2 dev callers) |
| G2 execution jobs | `e8a083f` `7c9a8b6` | 313 (249) | `useExecutionJobs` + its ToolExecutionJobs and Markdown callers |
| G3 param diff | `33582f4` | 403 (220) | `JobParametersDiff`; its only callers are the diff panel and the row-detail highlight |
| G4 router key | `7cc7b38` | 57 (27) | `centerRouterViewKey`, overlapping #24307 |
| H1 table | `c1fd62b` `8167590` `474d731` | 2234 (1186) | `ComparisonTable`, cells, `dataset_list` cell, "not supplied" |
| H2 page | `e1b596c` | 1130 (733) | `/comparisons`, `router.js` |
| H3 entry points | `2b10a5f` | 690 (268) | step card, job page, DatasetDetails, stored-workflow invocations |
| I polish | `5b0a80e` `3f9b458` `8e2c00d` `940d22c` `af7a5ce` `1260c79` `96cf9ca` | 1674 (1001) | change highlight, two-row diff, CSV/TSV, filter UI, batch pager in row detail, param highlight |
| J E2E | `1593627` | 371 (78) | `test_comparisons.py` (covers the diff panel and transpose), shared graph helpers, `navigation.yml` |

**Overlaps with open PRs, by commit**

| Open PR | Branch commit and file | Nature |
|---|---|---|
| #24307 | `7cc7b38` `Analysis.vue` | Same abstraction under another name (`reuseOnQueryChange`); a real conflict |
| #24307 | `2b10a5f` `WorkflowInvocationStep.vue` (+5) | One-block edit; the second to land rebases |
| #24307 | `e1b596c` `router.js` (+8) | Adjacent routes; trivial |
| #24307 | `1593627` `navigation.yml` | New top-level section; trivial |
| #24288 | `58dae6b` `managers/jobs.py`, `schema.py`, `api/jobs.py`, `test_jobs.py` | Adjacent one-line additions to `index_query` and `JobIndexQueryPayload`; trivial |
| #24288 | `b4e31b9` `comparisons.py` imports `get_count` from `managers.workflows` | #24288 moves it to `managers/base.py` and re-imports it in `workflows.py`. The import still runs, but mypy's global `no_implicit_reexport = True` (which `[mypy-galaxy.managers.workflows]` doesn't override) should flag it. That is a CI break, not a merge conflict: switch the import to `base` when #24288 lands. |
| #24288 | `b6de269` `totalMatches` | #24288 adds another hand-written `parseInt(total_matches)` in `client/src/api/jobs.ts`. Whichever lands second switches it to `totalMatches`. |
| #24288 | `4e0494d` `schema.ts` | Regen conflict; regenerate rather than merge |

**Constraints for every option:**
- A goes first, on its own.
- Each server/client cut needs its own `schema.ts` regen.
- Client commits after `4e0494d` compile against the final schema, including `dataset_list`. Any boundary that lands H1 before `70b7112` needs `vue-tsc` run at that point.

### Option 1: backend, then client (3 PRs)

| Order | PR | Contents | Lines (nt) |
|---|---|---|---|
| 1 | Baselines | A | 335 (0) |
| 2 | Comparison API | B, C, D, E, F, regen | ~4.5k (~2.4k) |
| 3 | Comparison UI | G1–G4, H, I, J | ~7.4k (~4.1k) |

- The cut matches commit order exactly, so there is no rework.
- The API PR carries every #24288 overlap; the UI PR carries every #24307 overlap.
- The API PR merges with no UI consumer. The UI PR is still large.

### Option 2: helpers first (4–5 PRs)

| Order | PR | Contents | Lines (nt) |
|---|---|---|---|
| 1 | Baselines | A | 335 (0) |
| 2 | Server refactors | `69c011e` (metadata keys) and `58dae6b` (job fields) | ~100 |
| 3 | Client refactors | G1, G2, G4 | ~930 (~610) |
| 4 | Comparisons | `b1b1a25`, C–F, regen, G3, H, I, J | ~10.9k |

- PR 2 and PR 3 are reviewable on their own: each already has dev callers (DatasetPopoverLink, ~12 `total_matches` parses, ToolExecutionJobs, Markdown selectors, `/galaxyai`).
- G4 can land as a tiny PR coordinated with #24307 (see the router-key scope below), or fold into #24307.
- `b1b1a25` and G3 have no dev caller. They stay with the feature, unless the `histories.py` second consumer below is taken.
- The feature PR is still ~10.9k.

### Option 3: vertical by mode (5–6 PRs)

| Order | PR | Contents |
|---|---|---|
| 1 | Baselines | A |
| 2 | Helpers | B and G, as in Option 2 |
| 3 | Mode 1 end to end | C, mode-1 parts of F, regen, H1, the `step_runs` kind of H2, the step-card entry point from H3, J |
| 4 | Mode 2 | D, its F parts, the Compare outputs entry point |
| 5 | Mode 3 | `58dae6b`, E, its F parts, the job page and DatasetDetails entry points |
| 6 | Polish | I |

- This follows plan.md's "ship mode 1 first", and each feature PR is ~3–6k.
- **Heavy rework.** `e1b596c`, `2b10a5f` and `c1fd62b` are kind-agnostic. `dec79a3`, `70b7112` and `6238e45` each change 2–3 modes. All of them must be split by hand, with a regen per PR.

### Option 4: MVP, then polish (3 PRs)

| Order | PR | Contents | Lines (nt) |
|---|---|---|---|
| 1 | Baselines | A | 335 (0) |
| 2 | MVP | B–F, regen, G1, G2, G4, H, J minus its diff-panel steps | ~10k |
| 3 | Polish | I with G3 and the J diff steps | ~2.1k (~1.2k) |

- The polish PR is a self-contained, reviewable story: diff, export, highlight and filters.
- The MVP remains large.
- J has to split. In `test_step_all_runs_across_versions`, `row_detail_changed_parameter` (`96cf9ca`) and `row_select`/`compare_selected`/`diff_*` (`3f9b458`) move to the polish PR. In `test_comparison_pages_from_entry_points`, `state_filter` (`940d22c`) moves too.

### Option 5: coordination-first, combinable with any of the above

Land G4 (57 lines, under #24307's name or a shared one) and `b6de269` (`totalMatches`) as two tiny PRs ahead of both #24307 and #24288. Then both open PRs, and this branch, rebase onto one helper each, instead of three branches hand-rolling the same thing.

## Scopes considered

### 1. As implemented

All of plan.md (modes 1–3, three GETs, the shared table, `/comparisons`, four entry points), Phase 5 polish, and the iteration-1 "finish the abstractions" expansion.

| Pros | Cons |
|---|---|
| Covers every row of plan.md's mode table, plus the plan's first "Later" item (two-row diff) | ~10.7k lines; any split takes deliberate work (see above) |
| Client helpers already have second consumers (`totalMatches`, `useExecutionJobs`, `ItemPopoverLink`) | Duplicates #24307's route-meta rule under a different name |
| Statement count per page is flat and pinned by tests | `output_runs` and subworkflow-step skipped outputs still show `null` while modes 1 and 3 show `skipped` |
| | #10039 asks for an editor view, and the branch has no editor entry point |

### 2. Reconcile the route-meta rule with #24307 (recommended)

`7cc7b38f2b7` generalises the `/galaxyai` keying as `meta.keepMountedOnQueryChange` in a tested `centerRouterViewKey` helper. #24307 makes the same change inline as `meta.reuseOnQueryChange`. Pick one name, keep the tested helper, and have both routes use it.

| Pros | Cons |
|---|---|
| One abstraction instead of two near-identical ones in John's own branches; reviewers will catch it | Couples landing order with #24307 |
| ~5 lines on either side | Needs a name decision. `reuseOnQueryChange` is already pushed in #24307; `keepMountedOnQueryChange` says what happens |

<details><summary>Details</summary>

- **If #24307 lands first:** rename to `reuseOnQueryChange` here, and keep the `routerViewKey.ts` helper and its test.
- **If this lands first:** #24307 drops its inline edit and sets the helper's meta key.
- **Either way:** take G4 out as a tiny PR (Option 5) so neither waits on the other.

</details>

### 3. Skipped outputs consistent across modes (recommended)

Return `Missing(skipped)` for `output_runs` workflow outputs that a skipped step produced, and for skipped subworkflow steps in `step_runs`. Today those render as `Value(null)`, while single skipped jobs in modes 1 and 3 already read `skipped` (`6238e45`).

| Pros | Cons |
|---|---|
| Fixes a gap in code the branch wrote; the three modes then agree | The skipped-subworkflow characterization test (`test_step_runs_skipped_subworkflow_step`) flips, which is intended |
| One batched creating-job state lookup per page, by the implementer's estimate | Mapped batches still keep collection cells (the same limit as today) |
| Could move into the cell builder ("HDA whose creating job is skipped"), so one rule covers every mode | |

<details><summary>Details</summary>

`_invocation_io` (`comparisons.py:279`) reads `WorkflowInvocationOutputDatasetAssociation.dataset_id` with no job join. A single statement over `JobToOutputDatasetAssociation` → `Job.state` for the page's HDA ids (or the HDA's skipped blurb) gives the skipped set. The cell builder already batch-loads HDAs, so it could carry the rule for all modes, and the per-mode `_mark_skipped_outputs` would then go away. This is the rescope's open question 1, which was left unanswered.

</details>

### 4. Workflow-editor entry point for #10039 (recommended, link form)

In the workflow editor's `NodeInspector`, a labelled step of a saved stored workflow gets "Compare runs of this step", linking to `/comparisons?kind=step_runs&workflow_id=…&step_label=…`. The link is hidden while the editor has unsaved changes, or for a new temporary workflow.

| Pros | Cons |
|---|---|
| #10039 is the issue cited for this feature, and it asks for the editor specifically | An unsaved label or rename would query a label no version has; the `hasChanges` gate covers this but needs a test |
| `/comparisons` and `StepRunsTab` are props-only, so this is a link plus a vitest (~30–50 lines) | Adds a fifth entry point; the editor isn't otherwise touched (#24307 touches only `WorkflowGraph.vue` there) |
| Lets the PR say it addresses #10039 rather than "relates to" | Embedding the table in the narrow inspector would be worse UX; the link form is the right size |

### 5. Contract to the original scope (`compare_runs_alt_original_scope`)

Drop the iteration-1 expansion: the `totalMatches` and `useExecutionJobs` second consumers, `keys=metadata_<name>`, the `output_runs` versions filter, the DatasetDetails link, and the skipped and declared-column fixes.

| Pros | Cons |
|---|---|
| ~660 fewer changed lines (513+, 149−) | Brings back helpers with one caller, and contradicts the iteration-1 decision |
| | Loses correctness fixes (declared-in-version inputs, skipped) |

### 6. Contract to the MVP (no Phase 5 polish)

Ship the plan's core and move group I (with G3) into a follow-up PR.

| Pros | Cons |
|---|---|
| ~2.1k fewer lines in the first PR; polish reviews as one coherent story | The diff panel is the main payoff of a uniform grid; reviewers may ask "why compare runs without a diff" |
| `JobParametersDiff` then lands together with its only callers | E2E has to be split |

### 7. Contract to mode 1 only for the first PR

`step_runs` plus the step card only; modes 2 and 3 follow.

| Pros | Cons |
|---|---|
| Smallest feature PR that tells the whole story (~5–6k) | Heavy hand-splitting of kind-agnostic client commits and multi-mode F commits (see Option 3) |
| Matches plan.md's "ship mode 1 first" | The shared model is reviewed without the other two shapes it was designed for |

### 8. Unused job-index additions (`58dae6b`)

`/api/jobs?tool_version=` and `copied_from_job_id` on `JobSummary` (index) have no client caller on this branch or dev. `tool_runs` uses its own query, and `JobInformation.vue` reads `copied_from_job_id` from show. Options:
- (a) Keep them as API completeness (D8/D14 were taken).
- (b) Give `copied_from_job_id` a caller: badge reused jobs in the `useExecutionJobs` batch pager ("job k of N, reused"), ~15 lines.
- (c) Drop the `tool_version` filter here and offer it to #24288's `JobsFilters`, its natural consumer.

| Pros | Cons |
|---|---|
| (b) closes the gap with a real, small consumer on dev | (b) is more UI in an already large branch |
| (c) shrinks the #24288 overlap | (c) reverses D8 |

**Lean:** (b) for `copied_from_job_id`, and keep `tool_version` per D8 for #24288's filters to pick up.

<details><summary>Sites that don't help</summary>

Dev's other `/api/jobs` index callers don't filter by tool version and don't show reuse, so neither field would help them:
- `SelectionField/services.ts` (unfiltered list);
- `api/jobs.ts` (POST only).

</details>

### 9. Second consumer for `GalaxyRBACAgent.accessible_dataset_ids` (follow-up)

`managers/histories.py:497` loops `can_access_dataset` per HDA per user when sharing a history, under `# TODO: Handle this is a more performant way`. That is the batched check this branch built. `services/history_contents.py:1345` and `library_contents.py:277` have similar loops.

| Pros | Cons |
|---|---|
| Gives the new RBAC helper a released consumer and fixes a flagged TODO | Changes released sharing code; needs admin and library-association parity checks |
| Fits a helpers-first split (Option 2, PR 2) | Not related to comparing runs; better as its own small PR |

### 10. Per-node run-count badges in the invocation graph (considered, deferred)

A grouped counts endpoint (label → runs), plus badges on invocation graph nodes linking to All runs.

| Pros | Cons |
|---|---|
| Makes the feature discoverable from the graph | Touches `InvocationGraph.vue` and `useInvocationGraph.ts`, which #24307 rewrites; a known conflict |
| One grouped query | New endpoint plus UI; better after #24307 merges |

### 11. Mode 1 for subworkflow inner steps (considered, deferred)

Address inner steps by label path (`outer/inner`) through `WorkflowInvocationToSubworkflowInvocationAssociation`.

| Pros | Cons |
|---|---|
| Large workflows (#10039's example) often nest | No design for identity across subworkflow versions (inlined copies versus stored references) |
| | M–L effort and a new query shape; a design question, not polish |

### 12. Tool-form "previous runs" panel (considered, waiting on John)

A panel on the tool form listing `tool_runs` for that tool (plan.md open question 2).

| Pros | Cons |
|---|---|
| Mode 3's most natural entry point | Tool-form layout is contested space; John hasn't answered the question |
| `ComparisonTable` is props-only, so embedding is feasible | Adds a fetch to every tool-form open unless lazy |

### 13. "Rerun of" column from #24174 (considered, deferred)

Show rerun lineage per mode 1/2 row.

| Pros | Cons |
|---|---|
| Single-step reruns produce exactly new mode 1 rows | Depends on the unmerged #24174 branch (new FK + serializers); stacking would block this PR |

### 14. Compare outputs by name/hid in link mode (design Q19, considered)

Output links are never highlighted or diffed, because every run makes new HDAs. Comparing by name, hid or the underlying dataset would change that.

| Pros | Cons |
|---|---|
| Makes the change highlight useful for outputs | Name/hid equality is mostly noise across runs; a dataset/hash identity needs a server field |
| | Open design question; not a gap |

### 15. Reject duplicate output labels on save (#24305, considered, separate)

The workflow API (upload and PUT) accepts outputs that share a label, and the invocation's `outputs` dict then shows one of them. Mode 2 already handles the result: columns carry `duplicate: true`, and `_invocation_io` keeps the first output by id.

| Pros | Cons |
|---|---|
| A related bug that mode 2 tiptoes around | The fix is on the workflow save path (`__walk_step_dicts`), not in comparison code |
| | #24305 is queued separately and assigned to John, with an open question (reject or warn for existing `.ga` files) |
| | Bundling it would put a behaviour change to released save validation inside a ~11k feature PR |

### 16. Smaller items not recommended

- **Per-workflow Runs page.** `/comparisons?kind=output_runs` covers it (plan Phase 5 #8).
- **Server-side `not_supplied` reason.** The client's role-aware text (`474d731`) already gives users the distinction.
- **`(user_id, tool_id)` index for mode 3.** This needs a migration; measure on a production-sized DB first.
- **Batches >500 jobs in the pager.** The pager is bounded by `/api/jobs`'s default limit; passing `job_count` is already done where it is known.
