
- Figure out how to get galaxy-brain consistently published so we can provide permalinks (can we push instead of relying on github actions - is jmchilton.net an option)
- Move POLISH_BRANCH.md and DECOMPOSE_BASELINE_CHANGES_AND_POLISH.md into GX_PROCESS_ documents. 
- Move GX_PROCESS_ documents into `_shared/gx_processes`.
- Implement review awards.
- Integration daily changeset work.
- Bring scope evaluation into development so implementers catch extensions (e.g. issue-thread abstractions) before building, not after.
- Move review queues next to their records, like `MY_BRANCHES.md`: `gx_reviews/PULL_REQUESTS.md` → `repositories/galaxy/reviews/PULL_REQUESTS.md` (and other agents' `PULL_REQUESTS.md`), generalize `PULL_REQUESTS_INDEX.md` by PROJECT, and have the plugin group review records by its sections (`groupingFor` in `record-groups.ts`).
- Move issue queues the same way: `ISSUES.md` → `repositories/PROJECT/issues/ISSUES.md`, generalize `ISSUES_INDEX.md`, and group issue records by its sections in the plugin. Agent dirs covering several projects (e.g. `workflow_libs`) need one queue per project.
- Revisit `ADR_RESEARCH.md`: decide whether to add a critical decision points doc step to branch processes (generalizing issue alternatives + scope evaluation); answer its open questions.
