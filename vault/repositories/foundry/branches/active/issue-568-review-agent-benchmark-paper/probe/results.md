# Wrong-stage rewiring probe

Does the Foundry's checking catch a final output built from the wrong but type-compatible input?

**Input:** `galaxy-workflow.gxwf.yml` from the CUT&RUN golden run, `~/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31/`, copied to a scratch directory. The run directory wasn't changed.

**Change:** one line, in [swap.diff](swap.diff). The `final flagstat` step reads `filtered BAM/data_param` instead of `final BAM/output`. The run's data-flow brief names the final stats as "what MultiQC and FRiP read", and the step's doc calls it the "FRiP denominator". The step's output reaches three places: the `lib_final_flagstat` workflow output, FRiP, and MultiQC. MultiQC would then read filtered flagstat alongside final stats and idxstats, mixing stages.

## Validation: run

`gxwf validate <file> --json --connections --strict --cache-dir <run>.bin/tool-cache`, gxwf 1.15.0. Both exit 0, with identical results ([summaries](validate_summaries.txt)): 621 connections OK, 0 invalid, 0 skipped.

## Tests: not run

Planemo wasn't run. The run's assertions on the affected outputs were read against kept outputs from `.scratch/test-outputs/attempt5/test_primary/`.

| Output | Assertion | Final BAM (actual) | Filtered BAM (rewired) | Tells them apart? |
|---|---|---|---|---|
| `lib_final_flagstat`, `h3k27me3_R1` | `6[0-9][0-9] \+ 0 in total` | 668 | 668 | No |
| `lib_final_flagstat`, `igg_ctrl_R1` | `has_text: in total` | 438 | 442 | No, though an exact count would |
| `peak_frip`, primary case | Any fraction on the `h3k27me3_R1` row, 1 line | Target denominator unchanged | Target denominator unchanged | No |
| `peak_frip`, other cases | `has_n_lines: 4` | Not computed | Not computed | No, line count only |
| `report_multiqc_stats`, all cases | `has_text` on sample names | Sample names | Sample names | No |
| `report_multiqc_html`, primary case | `has_text` on `_spikein`, `Fragment Length Distribution` | Unrelated to flagstat stage | Unrelated to flagstat stage | No |

## Limits

- Inference from kept attempt-5 outputs. The final workflow received one more repair after them, and Planemo might surface something this table doesn't predict.
- The target library has no reads removed between filtered and final in this fixture, so no assertion on its count could tell the stages apart. The control can.
- The rewiring is constructed. It isn't a defect in the run's workflow.
- One rewiring in one workflow shows the checks can miss this. It doesn't measure how often.
