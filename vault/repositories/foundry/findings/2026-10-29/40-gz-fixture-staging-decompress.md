# Workflow-test staging keeps `.gz` fixtures compressed unless `decompress: true`; no Foundry note says so

- Target: galaxyproject/foundry (`content/research/iwc-test-data-conventions/index.md`, `implement-galaxy-workflow-test`, and the debug Mold's surfaces). The staging default is intended upstream (see Root cause), so nothing is filed against planemo or Galaxy; an optional Galaxy enhancement is noted below. Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 10 attempt 1 (7 min, no step ran) and phase 11, planemo master 2a815808 (galaxy-tool-util 26.1.x), Galaxy release_26.1, 2026-10-31. Ledger `gz-fixture-explicit-filetype-not-decompressed` (major); staging half of `debug-mold-no-staging-failure-surface` (see finding 31).
- Existing issues/PRs: none in Foundry, planemo or Galaxy (searched "decompress"). Galaxy #19771 (fasta.gz used "as fasta" in a workflow) and #4443 are different. Local Mold fix `f766287a` (implement-galaxy-workflow-test rev 12, worktree `pipeline-run-chipseq`, not pushed).

## Symptom
The phase-8 tests gave 25 gzipped reference fixtures (`hg38-chr20.fa.gz`, `hg38-chr20-genes.gtf.gz`, `hg38-chr20-genes.bed.gz`, `e_coli_U00096_3.fa.gz`) an uncompressed `filetype` (fasta, gtf, bed) and no `decompress:`. Staging aborted: "Upload job ... produced output [hg38-chr20-genes.bed.gz] in state [failed_metadata]" (UnicodeDecodeError 0x8b in `interval.set_meta`). The FASTA and GTF uploads went green but stored the gzip bytes (magic `1f8b`, .gz sizes) under `fasta`/`gtf`. Repair R1 added `decompress: true`; attempt 2 staged cleanly.

## Root cause
Confirmed in source (release_26.1 line numbers).
1. `galaxy.tool_util.client.staging` sends every file target with `auto_decompress` = the fixture's `decompress` or `DEFAULT_DECOMPRESS = False` (`staging.py:46, 112, 351-364`). Upload honours an explicit `ext` and only decompresses when `auto_decompress` is set (`datatypes/sniff.py:872`), so the bytes are stored as given under the requested type.
2. This is deliberate: a41a098962d (2023, "Allow setting auto_decompress property in staging interface") added the `decompress: true` fixture key so a test "doesn't need to know what the server-side default is", and left the default off.
3. Galaxy *tool* tests do the opposite: `interactor.py:660` stages with `decompress` defaulting to True ("Match legacy test behavior", c27cec40a13). So habits from tool tests (and the agent's assumption that an explicit filetype makes upload decompress) don't carry over to workflow tests.
4. IWC follows the workflow-test default: of 168 `.gz` job inputs in `~/.foundry/iwc` (23ccd99), 162 declare a compressed datatype (`fastqsanger.gz`, `fasta.gz`, ...), 4 use `decompress: true`, 2 don't (`fastqsanger`). Foundry's `iwc-test-data-conventions/index.md:119` lists `decompress:` only as optional vocabulary.

## Evidence
Ledger entry; run-summary attempt 1; `driver-notes.md` (P10 attempt 1, R1). IWC survey: Python walk over `workflows/**/*-tests.yml` job blocks.

## Proposed fix
1. `iwc-test-data-conventions`: a "Compressed fixtures" paragraph: workflow-test staging stores bytes as given; either declare the compressed datatype when every consumer accepts it (IWC's habit) or set `decompress: true` beside the uncompressed `filetype`. Tool tests decompress by default; workflow tests don't. A gzipped `bed`/`interval` fails metadata at upload; `fasta`/`gtf` silently stay gzipped and fail later.
2. Mold fix `f766287a`: **keep, revised**. Keep the step-2 sentence and the eval property, add the compressed-datatype alternative ("or declare `fasta.gz`/`fastqsanger.gz` when the consuming inputs accept it"), and link the note rather than restating planemo internals. The property already exempts compressed datatypes.
3. Debug Mold: input-staging surface (finding 31's item 3 covers it).
4. Optional, Galaxy: staging could warn when a file with compression magic is sent with an explicit uncompressed `ext` and `auto_decompress` false. Not worth filing unless John wants it.

## Draft issue
**Title:** iwc-test-data-conventions: say workflow-test staging doesn't decompress `.gz` fixtures (use a compressed datatype or `decompress: true`)

In an nf-core/cutandrun wb2g run (2026-10-31) the test file gave gzipped references an uncompressed `filetype` (fasta, gtf, bed). planemo's staging (`galaxy.tool_util.client.staging`, `DEFAULT_DECOMPRESS = False`, deliberate since a41a098962d) uploaded them as-is: the BED failed metadata at upload and the FASTA/GTF were stored as gzip under uncompressed types. Galaxy tool tests decompress by default, workflow tests don't, and the conventions note lists `decompress:` only as optional vocabulary. IWC declares compressed datatypes on 162 of 168 `.gz` inputs and uses `decompress: true` on 4.

Proposal: add a "Compressed fixtures" paragraph to the note (compressed datatype when consumers accept it, else `decompress: true`; failure signatures), and reference it from implement-galaxy-workflow-test step 2 with an eval property (local fix `f766287a`, to be revised to include the compressed-datatype option).
