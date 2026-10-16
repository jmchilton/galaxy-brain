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

Waiting for Run 1's Galaxy phase to finish, so that only one planemo Galaxy runs at a time.
