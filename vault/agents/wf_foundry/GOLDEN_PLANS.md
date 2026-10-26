# Golden plans

Grow a Workflow Brief (the "plan") per workflow over repeated builds, and use what each build teaches to improve the brief-writing Molds. Goal from [#563](https://github.com/galaxyproject/foundry/issues/563): a place for workflow-specific learning, so each build starts from a richer plan.

Trial run here before it becomes a Foundry issue.

## Layout

`vault/projects/foundries/plans/<wf>/`, where `<wf>` is the fixture directory name (`nf-core__demo`):

| File | What |
|---|---|
| `golden.md` | The current golden brief. A valid Workflow Brief (`foundry check-workflow-brief` exits 0 or 4); nothing else in it. Versions are git history. |
| `HISTORY.md` | One row per iteration: date, version, golden.md commit, Foundry SHA, result, metrics. |
| `debriefs/<YYYY-MM-DD>-v<N>.md` | What iteration N's build did, the fold into v<N+1>, planner-loop candidates. |

No `index.md`: vault validation would then expect frontmatter.

## Review rule

The build route wants a recorded expert review. Here:

- A golden.md whose `### Decisions` has a line `Reviewed by John at v<N>` for the current version counts as reviewed.
- Otherwise the build runs with its open-question proposals accepted, the direct-build convention from [#694](https://github.com/galaxyproject/foundry/issues/694). The debrief says so.
- Declared blockers always stop the build. Fold or ask John; never delete a blocker to get a run going.

## The cycle

### 0. Seed (once per workflow)

Drive `nextflow-to-workflow-brief` on the fixture (ad-hoc case "<fixture> whole pipeline, end at a brief"). The caller-supplied objective is "convert the whole pipeline to an equivalent Galaxy workflow" unless John narrows it. Copy its `workflow-brief.md` to `golden.md` as v0, with `### Sources` naming the fixture's pinned SHA, and keep the producer's output as `debriefs/<date>-v0-seed.md` notes.

### 1. Build

Drive `workflow-brief-to-galaxy` per [TEST_PIPELINE.md](TEST_PIPELINE.md), with these changes to the brief:

- case: ad-hoc, "golden brief <wf> v<N>"; expect: the pipeline eval.md, plus a gxformat2 workflow that validates and whose workflow test runs.
- Copy golden.md into the run dir as `workflow-brief.md`; the run never edits it (the harness hash check enforces this).
- Review and preflight: record per the review rule above; run the real environment preflight.
- Return the ledger path and counts alongside the usual report.

Build from scratch each iteration. A rebuild measures the brief, not the previous workflow.

### 2. Fold (you, or a child you brief)

Read the run's `open-requirements.ledger.yml`, `run-summary.md` and `foundry-run.yml`. Turn durable workflow knowledge into brief edits:

- Brief-change recommendations → apply, or record why not.
- Decisions the run made on open questions → move to `### Decisions` when the run proved them (green test, validated wiring); leave the open question otherwise.
- Discoveries (wrappers found, data quirks, reference needs) → Requirements, Inputs and outputs, Related artifacts.
- `dropped` units with a cited `because` → a Scope or Open question entry so the next run tries or deliberately excludes them; uncited drops become open questions.
- Surrendered gaps → Open questions, or Blockers when no run can get past them without John.
- Environment findings → `## Agent Environment`.

Keep Galaxy design out of the brief per the brief contract (no step graph, tool state or final test declarations); tool and wrapper findings go in as evidence. Remove the `Reviewed by` line if the fold changed the brief. Commit golden.md as v<N+1>, write the debrief, add the HISTORY row.

Mold or harness defects go through the feedback ledger and the usual issue/Mold-fix path, not the brief.

### 3. Planner loop

For each fold edit, ask: could `nextflow-summary-to-workflow-brief` (or `summarize-nextflow`) have derived it from the pinned source? List those as planner candidates in the debrief. Every few iterations, re-run the seed on the same fixture and diff against golden.md; recurring misses become a `nextflow-to-workflow-brief` scenario whose expect names the miss (red first), then a Mold fix (green), via the normal issue and branch path.

## Metrics

Per iteration in HISTORY.md: last phase reached, planemo test (green/red/not run), steps in the final workflow, ledger counts (open gaps, `dropped` units, surrendered, brief-change recommendations), open questions vs decisions of the brief the build ran on (the folded version's counts go in Result). Richer and converging = more steps carried, fewer drops and surrenders, more decisions, fewer open questions.

## Known gaps

- `workflow-brief-to-galaxy` doesn't yet dispatch to the Nextflow reference-data and test-translation chain, so reference-heavy fixtures (smrnaseq, funcscan, atacseq) will stall there. Start with demo, bamtofastq, hlatyping.
- No fold Mold exists; the fold is agent judgment for now. If it settles, propose one.
