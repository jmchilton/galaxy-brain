# CalliNGS-NF golden-plan pre-plan

Pre-run research, 2026-10-29. Fixture `workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF`, pin `9e7ebf04` (2021-08-25, "v2.1", DSL2). Not nf-core: no schema, no nf-test, no `test` profile. Scenario: `nextflow-to-galaxy/scenarios.md:34` ("tiny").

## What the pipeline does

Linear GATK RNA-seq variant calling on one genome (`main.nf:71-123`, processes in `modules.nf`):

1. Reference prep: `samtools faidx`, `gatk CreateSequenceDictionary`, STAR `genomeGenerate` **without a GTF**, known-sites VCF filtered by a denylist BED with `vcftools --exclude-bed` + bgzip/tabix (`modules.nf:6-90`).
2. STAR 2-pass by hand: pass 1, then pass 2 with `--sjdbFileChrStartEnd SJ.out.tab`, hard-coded RG `SM:GM12878`; keep `NH:i:1` reads only (`modules.nf:97-143`).
3. `gatk SplitNCigarReads --refactor-cigar-string` (`modules.nf:153`).
4. `BaseRecalibrator` + `ApplyBQSR` against the filtered known sites; `sampleId = replicateId` minus a trailing 1/2 (`modules.nf:183-218`).
5. `groupTuple` per sample, then `HaplotypeCaller` with **multiple `-I`** BAMs + `VariantFiltration` (FS>30, QD<2, cluster 3/35) (`main.nf:102-106`, `modules.nf:227-262`).
6. Post-process: inline awk/perl PASS + DP>=8, `vcftools --gzdiff --diff-site` against the known sites, BED of shared sites, `vcftools --bed` known-SNP VCF, AF histogram via `bin/gghist.R` (`modules.nf:269-318`).
7. `gatk ASEReadCounter` per sample on the grouped BAMs (`modules.nf:327-350`).

## Test data

- All in-repo under `data/`: `genome.fa` 52 MB (chr22 only), `known_variants.vcf.gz` 0.5 MB, `denylist.bed` 19 KB, `reads/rep{1,2}_{1,2}.fq.gz` 1.2-1.9 MB each.
- Default `params.reads` is `rep1_{1,2}` only (`main.nf:38`); the `cluster`/`aws` profiles use `rep*`, two replicates merged into sample `rep`. CI (`.github/workflows/ci.yml`) runs the default, so `groupTuple` and multi-BAM HaplotypeCaller are never exercised with >1 BAM there.
- No external reference downloads, DBs or iGenomes. `validate-ci.sh` only checks five outputs are non-empty: `final.vcf`, `diff.sites_in_files`, `known_snps.vcf`, `AF.histogram.pdf`, `ASE.tsv`.

## Resources

- Heaviest: STAR `genomeGenerate` on 51 Mbp chr22, roughly 2-4 GB RAM and a few minutes at 4 CPUs; GATK java steps under 2 GB at this read depth. `mem_xlarge` labels (64 GB) apply only in the `cluster` profile.
- Fine to run alongside one other journey. The gatk4 biocontainer pull is about 1-2 GB.

## Galaxy wrapper outlook (gxwf tool-search, 2026-10-29)

| Step | Wrapper | Note |
|---|---|---|
| STAR | `iuc/rgrnastar` `rna_star` | History genome, no-GTF index and per-sample 2-pass are options; verify the RG line and the `NH:i:1` filter (fallbacks: Picard AddOrReplaceReadGroups, samtools/bamtools filter). |
| SplitNCigarReads, BaseRecalibrator, ApplyBQSR, HaplotypeCaller | `iuc/gatk4_*` | Exist. Check that they accept a history FASTA without a separate `.dict`/`.fai`, and whether HaplotypeCaller takes several BAMs. |
| VariantFiltration | Only `devteam`/`gatk2` (GATK 1/2) | Likely substitute: `bcftools filter`. GATK's cluster-window filter has no exact bcftools equivalent. |
| CreateSequenceDictionary, faidx | Picard/samtools wrappers | Probably implicit inside the gatk4 wrappers. |
| vcftools exclude-bed, diff-site, bed | `nilesh/vcftools` (old) | Prefer `bcftools view -T ^bed` / `bcftools isec`. |
| awk/perl DP filter, AF extraction | Text-processing tools | Feasible but fiddly; the parity risk is with the perl regex. |
| AF histogram (R) | ggplot2 histogram wrapper | Output parity is loose (PDF). |
| ASEReadCounter | **None found** | Likely drop. |

## Predicted stall points

- GATK reference companions (`.dict`/`.fai`) and the sed fix of the dict `UR:` path (`modules.nf:243-244`) are artifacts of running GATK directly. The brief should not demand them as inputs.
- Replicate grouping (sample = replicate id minus a trailing 1/2) needs a collection regroup in Galaxy. If HaplotypeCaller takes only one BAM, add a merge step first.
- ASEReadCounter has no wrapper. Expect a cited drop or a surrendered gap; one of the five CI outputs is missing.
- `vcftools --diff-site` output format (`.diff.sites_in_files`) feeds awk column `$4~/B/`. A bcftools substitute changes the intermediate format.
- Test data: decide one replicate (CI parity) vs `rep1`+`rep2` (exercises grouping). The 52 MB genome is fine for `planemo test`, but its "test-data" handling (local path vs URL) needs a decision: there is no remote copy except `s3://callings-nf/data/`.

## Suggestions

- Keep the objective "whole pipeline"; it is small. Worth asking John: accept a `bcftools filter` substitute for VariantFiltration and a drop for ASEReadCounter, or treat either as a blocker?
- Recommend test on both replicates so the per-sample grouping is real.
- Good first run: no DBs, no reference chain, short builds, GATK-specific lessons.

## Recommended run order (all three)

1. CalliNGS-NF: tiny, in-repo data, no DBs, linear. Fast signal on GATK/STAR wrapper behaviour.
2. bacass: wrappers proven in #563. Its seed can overlap CalliNGS's build; its BUSCO data-table question needs an answer first.
3. atacseq: largest and most likely to stall in design (regrouping, mixed PE/SE, many script drops). Run it alone or beside a seed-only phase.
