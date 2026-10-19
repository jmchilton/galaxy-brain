# Run 2: bacass-sr-assembly

nf-core/bacass 2.5.0 (`76e4b12c`) → brief → Galaxy. Agent-driven, human-reviewed. Plan: [brief-run-plan.md](../brief-run-plan.md). Setup is the same as [Run 1](demo-qc-trim.md#setup): headless `claude -p`, auto mode, plugin from a `b9c16bad` archive, artifacts local in `~/projects/foundry-runs/bacass-sr-assembly/`.

- `source-selection.md` (drafted by Claude): short-read path only, fastp → Unicycler → reference-free QUAST, "per sample". FastQC, Kraken2, kmerfinder, BUSCO, annotation, MultiQC and long-read/hybrid excluded.

## Phase A: nextflow → brief

- 14 min, 44 turns, $4.49 (39k output tokens). Ran concurrently with Run 1's Galaxy phase.
- Gates, re-run by the orchestrator: validate 0, check 0 (ready, no blockers).
- **Caught a selection error:** my "per sample … QUAST" contradicts the source, which runs one QUAST over all assemblies. It raised this as an open question rather than silently picking one. That is the scope-fidelity behaviour the brief exists for.
- It also surfaced things the selection didn't address:
  - multi-run merging (`CAT_FASTQ_SHORT`);
  - single-end reads;
  - the optional QUAST reference;
  - secondary outputs;
  - test-data choice.
- Corrected the CLI summary by hand in an ad-hoc `_scripts/enrich_summary.py` written outside the run repo. It isn't checkpointed, so the history doesn't show how the summary was changed.
- Side effects: pulled Docker `hello-world` to probe the container engine, and fetched the test sample sheets.
- Feedback ledger, 8 entries:
  - `summarize-nextflow` CLI defects:
    - major: silent `--profile test` overrides each nf-test file's own profile;
    - major: boolean params dropped from the params delta (`skip_kmerfinder`, which is what makes QUAST reference-free);
    - minor: sample-sheet path columns classified as meta;
    - minor: edge `from` text keeps line comments;
    - minor: defaults null when they're set only in `nextflow.config`.
  - Gaps (minor):
    - the summarize Mold says nothing on whether the agent may correct CLI output;
    - the brief Mold gives no rule for expert wording that conflicts with source behaviour (blocker or open question?);
    - the container-usability probe is undefined.

## Expert review

`~/projects/foundry-runs/bacass-sr-assembly/review.md` (local). Six open questions, decided by John via the orchestrator:

- per-sample QUAST, no combined report;
- one PE pair per sample, no run merging, no SE;
- outputs: assembly, QUAST, fastp reports, Unicycler graph (no log, no trimmed reads), no QUAST reference;
- tests on the source default `bacass_short.tsv` (two samples, about 1M reads each). John chose this over a smaller fixture despite the arm64 cost.

Committed as `review: expert edits`. Gates still 0/0. Brief sha256 at Galaxy entry: `b27b7b50…`.

## Phase B: brief → Galaxy

- 1h00m, 38 turns, $14.13. All 11 phases ran, each delegated to a subagent, with none handled manually. Phase 5 took 4 steps.
- **Preflight** caught `cli` 1.8.2 and `planemo` 0.75.44 and used pinned wrappers in `_bin/`. Brief hash unchanged after every phase.
- **Workflow:** a `list:paired` input; fastp 1.4.0+galaxy0 → Unicycler 0.5.1+galaxy0 → `__FILTER_FAILED_DATASETS__`/`__FILTER_EMPTY_DATASETS__` → QUAST 5.3.0+galaxy2 per sample with no reference. Five per-sample outputs, matching the review. Strict `gxwf` validation passes.
- **Scope held:** only the selected tools. QUAST runs per sample, per the review.
- **Test: FAIL on test authoring only.** All 9 jobs `ok` on arm64 Docker (the emulation risk didn't bite), and the fastp, assembly and QUAST assertions pass. The two GFA assertions use `has_line_matching '^S\t1\t'` / `'^L\t'`, but Galaxy matches whole lines, so they can never match. Phase 11 confirmed this against the real graph and proposed stricter full-line patterns. The fix isn't applied; a rerun takes about 25 min.

  | Sample | Total length | N50 | Contigs | GC |
  |---|---|---|---|---|
  | ERR044595 | 2,767,321 | 107,384 | 53 | 32.66% |
  | ERR064912 | 2,897,289 | 67,831 | 102 | 32.69% |
- Feedback ledger, 22 entries. Majors: assertion guidance doesn't say `has_line_matching` is whole-line; the debug skill doesn't say whether it may repair and rerun.
- **Side effects:** the phase-3 subagent fast-forwarded `~/projects/repositories/iwc` to `e8cd4de3d`, which is a write to your clone. Also left behind: `_scratch/` and `_scripts/runrec.py`. The setup commit subject `phase 0: setup` breaks the parsed grammar.

### Verdict

Reached a correct stop: the workflow is right and one test-authoring error is diagnosed. One assertion fix away from green.
