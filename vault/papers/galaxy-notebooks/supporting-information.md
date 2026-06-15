# Supporting Information

Supporting information for *Galaxy Notebooks: Reproducible Communication for Data-Intensive Analysis*. Every item is a real, committed artifact from the three worked vignettes; together they let a reader re-run each analysis and re-extract its workflow.

The bundle lives in `si/` beside the manuscript. Recipes render as pages (linked below); workflow `.ga` files and tool-install YAMLs are downloadable from the deployed site under `/galaxy-brain/si/` and are also in `si/` for local use.

**Caveats (read before relying on these).** Tool versions and parameters are pinned to the reference development server (Galaxy 26.2.dev0). Encoded dataset/collection identifiers are instance-specific; the recipes give the step to regenerate them rather than hard-coding them. Before journal submission these should be re-confirmed against the merged release and trimmed to the target's SI length limit.

## Contents

| SI item | What it is | Vignette | File | Source |
|---|---|---|---|---|
| Recipe S1 | Server-agnostic reproduction recipe | Mobile resistome (UC1) | [SI_Recipe_S1_mobile_resistome](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes1mobileresistome/) | `usecases/UC1_RECIPE.md` |
| Recipe S2 | Server-agnostic reproduction recipe | Differential ChIP (UC2) | [SI_Recipe_S2_differential_chip](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes2differentialchip/) | `usecases/UC2_RECIPE.md` |
| Recipe S3 | Server-agnostic reproduction recipe | Differential ATAC-seq (UC3) | [SI_Recipe_S3_differential_atac](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes3differentialatac/) | `usecases/UC3_RECIPE.md` |
| Workflow S1 | Extracted 14-step workflow | Mobile resistome (UC1) | [SI_Workflow_S1](/galaxy-brain/si/SI_Workflow_S1_mobile_resistome_14step.ga) | `UC1_MRSA_extracted.ga` |
| Workflow S2 | Single extraction, condition-pinned (34-step) | Differential ChIP (UC2) | [SI_Workflow_S2](/galaxy-brain/si/SI_Workflow_S2_chip_single_condition_pinned.ga) | `UC2_TAL1_single_condition-pinned.ga` |
| Workflow S3 | Map-over peak caller (5-step) | Differential ChIP (UC2) | [SI_Workflow_S3](/galaxy-brain/si/SI_Workflow_S3_chip_peak_caller.ga) | `UC2_TAL1_peak_caller.ga` |
| Workflow S4 | Pairwise comparator (29-step) | Differential ChIP (UC2) | [SI_Workflow_S4](/galaxy-brain/si/SI_Workflow_S4_chip_comparator.ga) | `UC2_TAL1_comparator.ga` |
| Workflow S5 | Extracted 5-step workflow | Differential ATAC-seq (UC3) | [SI_Workflow_S5](/galaxy-brain/si/SI_Workflow_S5_differential_atac.ga) | `UC3_ATAC_extracted.ga` |
| Data S1 | ephemeris/shed-tools install list | Mobile resistome (UC1) | [SI_Data_S1](/galaxy-brain/si/SI_Data_S1_mobile_resistome_tools.yml) | `mrsa-mobile-amr-tools.yml` |
| Data S2 | ephemeris/shed-tools install list | Differential ChIP (UC2) | [SI_Data_S2](/galaxy-brain/si/SI_Data_S2_chip_tools.yml) | `tal1-candidate-genes-tools.yml` |
| Data S3 | ephemeris/shed-tools install list | Differential ATAC-seq (UC3) | [SI_Data_S3](/galaxy-brain/si/SI_Data_S3_atac_tools.yml) | `atac-differential-tools.yml` |

## Reproduction recipes

- **[SI_Recipe_S1_mobile_resistome](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes1mobileresistome/)** — four-isolate *S. aureus* ARG↔IS proximity analysis (BioProject PRJDB8599). Notable: the `remove_short_is=true` gotcha that governs byte-identical reproduction.
- **[SI_Recipe_S2_differential_chip](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes2differentialchip/)** — TAL1 differential binding between two blood-cell lineages (mm10, MACS2); documents the nested `list:list` design encoding and the caller/comparator split.
- **[SI_Recipe_S3_differential_atac](/galaxy-brain/papers/galaxy-notebooks/si/sirecipes3differentialatac/)** — differential ATAC-seq accessibility (DESeq2 → NA-filter → volcano); the on-graph vs off-graph documentation that governs whether extraction seeds anything.

## Extracted workflows

Import any `.ga` directly into Galaxy (Workflows → Import). Workflows S1 and S5 are the clean baselines; S2 is the runnable-but-condition-pinned single extraction; S3 + S4 are the reusable decomposition of S2 (map-over caller + pairwise comparator).

## Tool-install lists

Install per vignette with `shed-tools install -g <server> -a <key> -t <SI_Data_*.yml> --skip-install-resolver-dependencies` (ephemeris installed isolated via `uv tool`). Each recipe also lists confirmed tool IDs and versions inline.

## Not included

The `UC*_DEBRIEF*.md` and `UC*_PAPER_INTEGRATION.md` files under `usecases/` are internal working notes, not supporting information.
</content>
