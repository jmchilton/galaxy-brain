# foundry#563 — Workflow Plan (now "Workflow Brief")

[Issue](https://github.com/galaxyproject/foundry/issues/563)

Labels at triage (2026-10-16): `needs-triage`. Filed as `queued` despite that label: the pipelines it asks for have landed, so the next move is ours, a real run.

- Plan: [brief-run-plan.md](brief-run-plan.md).
- The pipelines landed on `main` in #682 (2026-10-15, `b2cdd98b`): paper, interview and Nextflow → brief, plus brief → Galaxy. [branch notes](../../../branches/merged/rfc-workflow-brief/index.md)
- The brief CLI (`foundry validate-workflow-brief`, `check-workflow-brief`) shipped in `@galaxy-foundry/gxwf-foundry@0.2.0` with the #561 release (2026-10-16).
- Closed 2026-10-19 by John after runs 1–2 met the close rule; close comment summarizes both runs. Next: paper A/B run 3 (Mold family merge), follow-up issues from the ledgers.
- Follow-up from runs 1–2: [foundry#688](https://github.com/galaxyproject/foundry/pull/688) (branch `brief-open-question-proposals`, worktree `~/projects/repositories/foundry-brief-oq`). Open questions stay non-blocking (John: one-shot generation must allow best guesses). Instead briefs propose answers + evidence (low confidence marked), the interface Mold records each as a ledger decision (`open_question`, `basis`), test-plan reads them, and runs report them at Done.
- Run 3 done 2026-10-20. Merge proposal [issue_draft_mold_family_merge.md](issue_draft_mold_family_merge.md) posted 2026-10-21 as [#694](https://github.com/galaxyproject/foundry/issues/694), implemented on branch `issue-694-direct-build-on-brief`. [notes](../../wip/694/index.md)
- Run 3 plan: use the #688 casts, and leave some brief open questions unanswered on purpose to exercise proposals → ledger decisions → Done report. Paper: DengueSeq (Vogels 2024), picked 2026-10-20 as a non-Galaxy paper; scorecard [runs/dengueseq-denv3.md](runs/dengueseq-denv3.md). #688 merged as `f275059e`.

## Runs 1–2 (2026-10-16/17)

Scorecards: [demo-qc-trim](runs/demo-qc-trim.md), [bacass-sr-assembly](runs/bacass-sr-assembly.md). Headless `claude -p` sessions, plugin from `b9c16bad`, with John as expert reviewer.

| Run | Brief | Galaxy | planemo | Cost |
|---|---|---|---|---|
| 1 demo | 10 min, gates 0/0, 6 open Qs | 11/11 phases (resumed after a usage limit) | case 1 pass; case 2 hit a planemo crash on null skipped leaves | ~$70 |
| 2 bacass | 14 min, gates 0/0, 6 open Qs | 11/11 phases, all via subagents | all jobs ok; 2 GFA assertions never match (whole-line `has_line_matching`) | ~$19 |

- **Against the decision rule:** both runs reached a correct stop, the brief was unchanged, and scope held. So #563 met the close criteria; closed 2026-10-19.
- **Cross-run findings:**
  - Open questions don't gate `check-workflow-brief` (both runs).
  - `summarize-nextflow` CLI defects in both runs: null defaults, dropped booleans, silent `--profile test`.
  - Preflight worked as designed: it caught all env gaps and used ephemeral pinned tools.
  - Debug phases diagnosed failures correctly and didn't self-repair.
- **Agent side effects to review:** writes to `~/miniforge3/envs`, `/tmp/foundry-dqt-conda`, and a fast-forward of the `~/projects/repositories/iwc` clone. Relevant to #562 (sandboxing).
- Feedback ledgers hold 69 entries across 4 runs. None filed or drafted yet.
