# First real brief runs: plan

Goal: one honest, agent-driven run of SOURCE → BRIEF → expert review → GALAXY where the `planemo` gate actually runs. Drafted 2026-10-16 against `main` at `b9c16bad` (#682 and #561 merged).

What each run decides:

- Nextflow runs 1–2 decide #563 (close or keep open).
- Run 3, a paper A/B, decides whether the freeform and brief Mold families merge. The Nextflow runs can't settle that: they don't touch the freeform Molds.
- All runs feed the paper's Case Study section ([case-study.md](../../../../../papers/foundry/case-study.md)). Label them "agent-driven, human-reviewed", not harness-automated.

## Cases

| Run | Source (pin) | Selected scope | Excluded | IWC comparison |
|---|---|---|---|---|
| 1 smoke | nf-core/demo 1.1.0 (`45904cb9`) | per-sample FASTQC + SEQTK_TRIM | MULTIQC aggregate | `read-preprocessing/short-read-qc-trimming` (fastp + multiqc), loose |
| 2 main | nf-core/bacass 2.5.0 (`76e4b12c`) | short-read assembly + assembly QC: FASTP → UNICYCLER → QUAST | long-read/hybrid paths, Kraken2, kmerfinder, annotation (Prokka/Bakta/DFAST), MultiQC | `genome-assembly/bacterial-genome-assembly` (shovill + bandage) |
| 3 A/B | paper (TBD) | one analysis from a multi-analysis paper | the rest | an IWC workflow if possible |

Why these:

- Both Nextflow pins are already in `workflow-fixtures/fixtures.yaml`, and bacass already has a committed `summarize-nextflow` run to compare against.
- bacass exercises scope selection, which is mvdbeek's "did the paper do more than one thing" point.
- The selected bacass scope needs no reference data. `workflow-brief-to-galaxy` doesn't yet dispatch to the Nextflow reference-data chain.

## Setup

- Fresh workspace outside the foundry repo, `~/projects/foundry-runs/<slug>/`, so foundry's dev `CLAUDE.md` doesn't steer the agent.
- New Claude Code session. Install the plugin the way users do (`/plugin marketplace add galaxyproject/foundry`, `/plugin install foundry-skills@galaxy-workflow-foundry`). Record the foundry commit.
- Source checkout at its pin under `sources/`.
- John writes `source-selection.md`, which holds the expert intent. I draft it in the format of `content/pipelines/nextflow-to-workflow-brief/examples/source-selection.md` for John to approve.
- Leave the known environment gaps unfixed so preflight has to catch them:
  - `planemo` 0.75.44 is installed; the pipelines pin 0.75.47.
  - Global `@galaxy-tool-util/cli` is 1.8.2; the pipelines want `^1.13.1`.
  - `foundry` CLI isn't installed; `@galaxy-foundry/gxwf-foundry@0.2.0` is now on npm.

## Protocol (per run)

1. **Brief:** run `/pipeline-nextflow-to-workflow-brief --checkpoint --feedback <slug>-brief`.
   - Gate: `foundry validate-workflow-brief` exits 0.
   - Record the `check-workflow-brief` exit code. A blocked brief is an acceptable output.
2. **Review (John):**
   - Edit the brief and resolve its blockers.
   - Write `review.md`: who, when, what changed and why.
   - Do current preflight. Upgrade the tools only after preflight has flagged them.
3. **Galaxy:** run `/pipeline-workflow-brief-to-galaxy --checkpoint --feedback --use-subagents <slug>-galaxy`, which ends in `planemo test` with Docker.
4. **Score** in the vault as `563/runs/<slug>.md`:
   - Eval properties from each pipeline's `eval.md`:
     - deterministic: blocker gate, brief hash unchanged, `gxwf` + `planemo` results;
     - LLM-judged: scope held, ledger classification.
   - IWC comparison: tools, input/output shapes, collection mapping.
   - Every human intervention, with its cause.
   - Wall-clock time and rough token cost.
   - Findings from `foundry-feedback.ledger.yml`.
5. **Findings:** draft foundry issues in the vault. Open them only on John's OK.

## Decision rules

- **Close #563** if runs 1 and 2 meet all of these:
  - they reach a passing `planemo test`, or stop where stopping is the correct behaviour;
  - the brief is unchanged;
  - scope held.

  Post a summary comment only on John's OK. Otherwise keep #563 open with the list of gaps.
- **Merge the Mold families:** run 3 decides. Run the same paper and scope through `paper-to-galaxy` (freeform Molds) and through `paper-to-workflow-brief` → `workflow-brief-to-galaxy`, then compare the drafts, the interventions, and how well scope held.

## Risks

- This machine is arm64. The biocontainers are amd64, so Unicycler/SPAdes under emulation may be very slow. Fallback: run planemo against an x86 Galaxy or a remote one (`--engine external_galaxy`).
- Run 1 may be too thin to exercise data-flow and template design. That's acceptable for a smoke run.
- #282 (fixed filenames) is handled by the run-slug directories. #562 (sandboxing) is out of scope.

## Unresolved questions

- Run 1 scope: FASTQC + SEQTK_TRIM, or FASTQC only so the brief can be diffed against the committed example?
- bacass on arm64 Docker: run locally and see, or go straight to an x86 or remote Galaxy?
- Which paper for run 3? It needs several analyses and an IWC equivalent.
- Run artifacts: keep them local only, or commit them somewhere in foundry (e.g. a `case-studies/` dir)?
- Is `~/projects/foundry-runs/` OK as the workspace root?
