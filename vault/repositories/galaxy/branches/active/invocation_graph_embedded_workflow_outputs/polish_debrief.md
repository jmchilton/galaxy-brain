Run via claude-opus-5-5 at medium effort.

# Polish debrief: invocation_graph_embedded_workflow_outputs

Polished at `3b546b24e6f`, force-pushed to `jmchilton`. The code changed in one small way: embedded table cards now hide their unusable pagination row, and the E2E test checks this. The 19 hardening commits were squashed into six logical commits. The branch is in `branches_ready_for_final_review`.

```text
exists /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/differential-review/snapshots/20261103T220531Z-polishing-3b546b24e6f3.json
  polishing @ 3b546b24e6f3 vs invocation_graph_output_previews (merge-base 90cdc7089d9c)
  since 20261103T214343Z-hardening-4d64ca215297:
    commits: 1 same, 0 rebased, 1 changed, 4 new, 17 dropped
    hunks:   29 carried, 3 changed, 0 new, 0 dropped
```

The three changed hunks are the pagination fix: the CSS rule in `InvocationEmbeddedOutputs.vue`, a `table_pagination` selector in `navigation.yml`, and a two-line assertion in `test_embed_workflow_outputs`. Everything else is carried over unchanged from the hardened tree.

## Steps

| Step | Outcome |
|---|---|
| 1. CI | At `4d64ca21529` the result was pending, with nothing failed (11 runs; Python and client linting green). After the force-push, at `3b546b24e6f`: Python linting, client linting and first startup are green. The other runs are in progress, Playwright and Integration Selenium included, or queued (macOS). Nothing has failed. |
| History | Squashed 19 commits into 6, following scope evaluation Option 1 but with the collection summary placed before the feature so that each commit builds: `a5b16ff29b9` baseline test helper (unchanged, first), `52f955f719e` WorkflowGraph hooks, `404b25b0db7` layout module, `123f3d2b861` collection summary option, `ed663d7b626` feature, `3b546b24e6f` E2E test and selectors. Every message describes the final state; none mentions the down toggle. Force-pushed with `--force-with-lease` against `4d64ca21529`. |
| Pagination | `:deep(.pagination) { display: none; }` in the card body. The E2E test asserts that the `top_rows` card has a pagination element and that it is hidden. |
| 2–3. Checklist | GENERAL plus WORKFLOW_RELATED ([pr_checklist.md](pr_checklist.md), claude-opus-5-5 at medium effort). All items pass. "Who hits this" passes on John's 2026-11-03 decision about the requirements draft and spike screenshots. |
| 4. Description | [pr_description.md](pr_description.md). It leads with three before/after pairs (test workflow, ChIP-seq at 50%, ATAC-seq at 50%), says it stacks on stage 1 and covers only stage 2, and lists the known gaps plainly in their own details block. |
| 5–6. Strengthening | One round (claude-opus-5-5 at medium effort). All its edits were to the description. Applied: downstream steps also move; outputs exist from scheduling, not completion; one re-layout when a late-scheduled step gets outputs; the flip figure stated as offline pairwise orderings; replica labels moved out of the details block; and highlighted sentences saying stage 3 comes separately, nothing is saved, only labeled outputs get cards, nothing loads until the toggle is on, and the Outputs tab and hover are unchanged. The branch didn't change after the checklist, so the checklist wasn't rerun. |
| 7. Check Galaxy | `make format` made no changes. mypy on the Selenium file shows 18 errors in the file, unchanged from hardening (the unannotated test methods). vue-tsc is clean. eslint has no errors (13 warnings, all already present). Prettier is clean. Vitest on `Workflow/Invocation/Graph` and `Workflow/Editor`: 46 files, 423 tests pass. Playwright `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` pass (237 s). |
| Screenshots | Frames 01–10 were retaken at `3b546b24e6f` with the hardening driver, using the same anchors and zooms. 01–03 come from the E2E run. 04/05, 06/07, 08 and 09/10 come from the live replicas, now on ports 8091/5181. Both frames of each flip pair were retaken, so the history storage meter matches within each pair. Frames 11–14 (running invocation) were kept: their table cards are clipped above where pagination would sit, so the fix doesn't change them. |
| 8. Titles | [pr_titles.md](pr_titles.md). No version prefix (target is `dev`). |
| 9. Tags | [pr_tags.md](pr_tags.md): `kind/feature`, `area/UI-UX`, `area/workflows`, the same set as stage 1. The labeler's `area/client`, `area/testing` and `area/testing/selenium` were dropped. |

## Left over

- **Measure the other four IWC layouts (strengthening, optional, not done).** Only four of the eight IWC workflows in the scratch set were measured. Measuring the rest would let Risk Details drop "Workflows unlike these may nudge more".
- **Question for John:** should outputs that appear late (a step scheduled after a subworkflow) also trigger a refit? Today they re-lay out once without one. Changing this would change behaviour, so it's out of polish scope.
- **Placement nit:** the Embed Outputs button sits over cards near the canvas's lower left (the `TSS Enrichment Score` card in frame 10), as the zoom controls do. Left as is.
- **Stale SHAs in hardening notes.** `implementation_debrief.md`, `screenshot_debrief.md` and the stage 3 rebase notes cite pre-squash SHAs (for example `4d64ca21529`, `e489b5d267d`). The trees match apart from the pagination fix. Stage 3 should rebase onto `3b546b24e6f`.
- **CI** was still running at hand-off. Recheck Playwright and Integration Selenium, which exercise the branch's Selenium test.
- The worktree's Galaxy and Vite servers were stopped; `universe.sqlite` keeps the replica invocations for retakes.
