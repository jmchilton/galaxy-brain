# Run 1: demo-qc-trim

nf-core/demo 1.1.0 (`45904cb9`) → brief → Galaxy. Agent-driven, human-reviewed. Plan: [brief-run-plan.md](../brief-run-plan.md).

## Setup

- Workspace `~/projects/foundry-runs/demo-qc-trim/`; artifacts local only.
- Source: worktree of `~/projects/repositories/nf-core-demo` at the pin, in `sources/nf-core-demo/`.
- Agent: a fresh headless `claude -p` session per pipeline, `--permission-mode auto`, stream-json logs in `_logs/`. John's user settings and global CLAUDE.md applied, as for any user.
- Plugin: `--plugin-dir` on a `git archive` of foundry `b9c16bad` `casts/claude`, not a marketplace install. Same content, and John's plugin config stays untouched. Side effect: the run record's `foundry_head` is null.
- `source-selection.md`: drafted by Claude (orchestrator), scope FASTQC + SEQTK_TRIM, MultiQC excluded. John didn't approve it before the run; they reviewed the brief built from it.

## Phase A: nextflow → brief

- 10 min wall-clock, 43 turns, $3.39 (29k output tokens, 3.5M cache read).
- Gates, re-run by the orchestrator: `validate-workflow-brief` 0, `check-workflow-brief` 0 (ready, no blockers).
- The agent used `npx` for `foundry` instead of installing it globally, and probed the environment without installing anything. The brief's Agent Environment records `gxwf` 1.0.0 and `planemo` 0.75.44 without comparing them to the pins of the Galaxy pipeline it can't see.
- Scope held: FASTQC + SEQTK_TRIM included; MultiQC, versions and bookkeeping excluded; unused reference params called out as excluded. No Galaxy design choices.
- Quality: preserved source behaviour a port would likely "fix" (QC on untrimmed reads only, trimming not pair-aware, multi-row sample merging).
- Harness deviations (self-reported): extra `setup:` and `close run:` commits, and a second phase-2 commit after the run was closed.
- Feedback ledger, 6 entries:
  - `summarize-nextflow`:
    - major: config params-block defaults come out null;
    - major: sample-sheet grouping semantics aren't captured;
    - minor: nf-core housekeeping subworkflows classified `pipeline`;
    - minor: channel source text truncated;
    - minor: `--profile` silently defaults to `test`.
  - Brief Mold, minor: says to retain the check result but declares no artifact for it.

  The agent notes that the two majors also appear in the committed `runs/nf-core__demo/summary.json`.

## Expert review

`~/projects/foundry-runs/demo-qc-trim/review.md` (local). Six open questions, decided by John via the orchestrator:

- keep `skip_trim` as a boolean option;
- reports and trimmed reads only (no zips, `trimfq` defaults fixed);
- keep multi-row merging and the sample-sheet constraints;
- snapshot agreement means equal decompressed reads.

Edits were applied by Claude and committed in the brief repo as `review: expert edits`. Gates are still 0/0. Brief sha256 at Galaxy entry: `792d56de…`.

**Finding:** the brief had six open questions and an empty Blockers section, so `check-workflow-brief` said "ready". Open questions don't gate. Either the Mold should promote design-affecting questions to Blockers, or the Galaxy pipeline's review gate should require Open questions to be resolved.

## Phase B: brief → Galaxy

- Started 2026-10-16 23:05Z and ended 01:24Z, exit 1: the headless session hit John's **usage limit**. The cost recorded so far is about $30.
- It reached phase 9, `validate-galaxy-workflow`, with phases 1–9 committed. Phase 5 took 2 iterations: `regroup_by_sample` and `validate_endedness`. Phase 6 selected `find-test-data`.
- There's an extra harness commit, `sample_sheet preflight spike evidence`, and the agent spent long stretches "waiting on spike run". That's the sample-sheet merge requirement John kept, which is costly to prove out.
- Artifacts present: `galaxy-workflow.gxwf.yml`, tests, an expect-failure test for mixed endedness, `open-requirements.ledger.yml`, `workflow-test-run/`.
- Not done: phase 10 (`run-workflow-test`) and phase 11 (`debug-galaxy-workflow-output`). Resumed 2026-10-17 with `claude -p --resume` on the same session.

### Gates and records through phase 9

- **Preflight caught all three env gaps.** It ran `gxwf` and `galaxy-tool-cache` at 1.13.1 via `npx` and `planemo` 0.75.47 via `uvx`, and installed nothing globally. It also found that the PATH `gxwf --version` is hard-coded to `1.0.0`, though the package is 1.8.2 (filed as feedback). The brief-production agent had recorded that misleading 1.0.0.
- **Blocker check:** recorded in `foundry-run.yml` `preflight`, exit 0. Expert review is recorded as `../review.md`.
- **Brief hash:** unchanged (`792d56de…` in both the Galaxy run dir and the brief repo).
- **`open-requirements.ledger.yml`:** 66 entries: 28 discoveries, 19 decisions, 0 obligations, 1 proposed brief change. The change restates the gzip filename constraint as "inputs are gzip FASTQ", since collection elements have identifiers, not names. It stays `proposed` and wasn't applied: correct behaviour.
- **Cost of the sample-sheet semantics John kept:** spikes for multi-row regrouping, an endedness guard, and Apply Rules (`evidence/*-spike/`), and two draft-step iterations, `regroup_by_sample` and `validate_endedness`.
- **Feedback ledger, 27 entries** (5 major):
  - Majors:
    - the sample-sheet note doesn't cover a repeated grouping key;
    - no pattern for a guard step that fails the invocation;
    - the draft-step skill never extracts at loop end;
    - planemo workflow tests ignore `expect_failure`;
    - nf-core snapshot gz md5 semantics are unstated.
  - Minors cover `gxwf` validation gaps (apply-rules builtin, collection-type checks in tests), Mold silences, and test-plan schema limits.

### Phases 10–11 (resumed)

- The resume took 36 min and cost $37.0. Phase B total: about 2h55m of agent time and $66.6. The resume re-ran the blocker and hash checks: both clean.
- **Case 1 (skip_trim false): PASS** in planemo 0.75.47. Trimmed reads match the source nf-core snapshot after decompression; FastQC assertions pass.
- **Case 2 (skip_trim true): no verdict.** All jobs ran `ok` or `skipped`. Then planemo crashed in `_check_output_collection` → `verify_dataset` (`TypeError`), because skipped leaves are `expression.json` `null` and planemo's CWL-style `_output_object` is `None`. The bug is also present on planemo master `d171869b`. Phase 11 reproduced it offline and confirmed the authored assertions hold against the real files.
- **Mixed-endedness rejection: not run.** planemo has no workflow `expect_failure` support. The guard behaviour rests on `evidence/guard-spike/`.
- **Attempt 1 failed on the environment:** the `tp_awk_tool` conda env failed to activate in the shared `~/miniforge3`. Later attempts used a private prefix, `/tmp/foundry-dqt-conda` (1 GB, left behind).
- **Phase 11 behaved correctly:** it classified the failure (harness defect, not workflow or test), recommended repairs R1–R3, and applied none of them.
- **Scope held:** the workflow uses fastqc, seqtk_trimfq, tp_awk, map_param_value, collection_element_identifiers, `__APPLY_RULES__` and `__FLATTEN__`; no MultiQC. The brief hash was unchanged throughout.
- **Side effects outside the run:**
  - conda envs `__gawk@5.4.1`, `__coreutils@9.11`, `__seqtk@1.4` and `__pigz@_uv_` in `~/miniforge3/envs`;
  - `/tmp/foundry-dqt-conda`;
  - `../_harness/`.

  None of them have been removed.
- Feedback ledger closed with 33 entries. The agent flagged two of them as needing weighing before filing.

### Verdict

Reached a correct stop. The workflow is correct on the main case. The other case is blocked by a planemo defect, and the agent diagnosed it rather than papering over it. Your choice to keep the sample-sheet semantics roughly doubled the Galaxy phase's cost.
