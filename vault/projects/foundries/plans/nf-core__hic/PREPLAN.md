# nf-core/hic golden-plan pre-plan

Pre-run notes, 2026-11-01. Fixture `workflow-fixtures/pipelines/nf-core__hic`, 2.1.0, pin `fe4ac656` (local fixtures commit `40fc911d` on worktree `pipeline-run-chipseq`, unpushed). Objective: whole pipeline. Unverified hints.

## Shape

- `workflows/hic.nf` (299 lines), older DSL2 style (`lib/`, `modules/local` mostly). PREPARE_GENOME (bowtie2 index, chrom sizes, restriction fragments from a `digest` key or explicit `restriction_site`/`ligation_site`, or `dnase` mode) → HICPRO (two-step bowtie2 mapping with read trimming at the ligation site, MERGE_BOWTIE, COMBINE_MATES, GET_VALID_INTERACTION or the DNase variant, MERGE_VALID_INTERACTION, BUILD_CONTACT_MAPS, ICE_NORMALIZATION, stats) → COOLER (cload per `bin_size`, balance, dump, zoomify to mcool) → distance-decay plot (hicPlotDistVsCounts), COMPARTMENTS (cooltools eigs-cis), TADS (`tads_caller` insulation and/or hicFindTADs) → MultiQC.
- Per-resolution fan-out: `bin_size`, `res_dist_decay`, `res_tads`, `res_compartments` are comma-separated lists, so the brief has to say how resolutions map onto Galaxy (list inputs or collections).
- `digest` is a config map from enzyme name to restriction/ligation sites (hindiii, arima, dpnii, …), the same lookup class as genome keys.

## Test profile

- `conf/test.config`: 1 PE sample (SRR4292758 subset, Schalbetter 2017 yeast), `fasta` W303 by URL, `digestion hindiii`, MAPQ and fragment/insert filters, `bin_size '2000,1000'`, `res_tads 1000`, `tads_caller 'insulation,hicexplorer'`, `res_compartments 2000`.
- No `tests/` dir: no nf-test snapshots or pytest-workflow YAMLs, so test selection falls back to the test profile (finding 08 territory).

## Expected design problems

- HiC-Pro's own scripts (`bin/` python: mapped_2hic_fragments, merge stats, ICE) likely have no Tool Shed wrappers; IWC uses HiCUP + cooler instead. User tools vs substituting HiCUP is the main scope decision.
- Ligation-site trimming between two bowtie2 passes and the mate-combining step.
- Enzyme-key lookup into explicit inputs.
- IWC `epigenetics/hic-hicup-cooler` is the IWC compare reference (HiCUP, cooler, no ICE/TADs/compartments as far as known).
