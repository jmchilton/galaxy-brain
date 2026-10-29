# CalliNGS-NF: RNA-seq variant calling and allele-specific expression

## Workflow

### Objective

Reproduce the whole CalliNGS-NF analysis as an equivalent Galaxy workflow (expert request). For paired-end RNA-seq reads from one or more samples, each sequenced as one or more replicates, the workflow aligns reads to a reference genome, calls and filters single-sample variants with GATK best practices for RNA-seq, compares the calls with a set of known variants, and measures allele-specific expression (ASE) at the known heterozygous sites the calls recover. Per sample, the outcome is a filter-annotated variant call set, a comparison of the calls with known variants, the known-SNP subset of the calls, an allele-fraction histogram, and a per-site ASE read-count table.

Who asked for what:

- **Expert (caller):** convert the whole pipeline, expansive reading; test with both replicates; keep GATK ASEReadCounter and VariantFiltration in scope; search for GATK4 or equivalent Galaxy wrappers and cite evidence for any substitute or drop; no other Galaxy requirements; the terminal artifact of this run is this brief.
- **Source:** every statement attributed to `main.nf`, `modules.nf`, `nextflow.config`, `bin/`, `data/`, CI or the Dockerfile below is source evidence, not a Galaxy choice. Named tools and file formats are evidence of what the source does, not of an available Galaxy tool or datatype.

### Sources

- Pipeline: CRG-CNAG/CalliNGS-NF, https://github.com/CRG-CNAG/CalliNGS-NF, pinned at commit `9e7ebf04455a24877a92c87216b9629ee2b6088d` (2021-08-25, banner "v 2.1", DSL2). License MPL-2.0 (`LICENSE:1`, `main.nf:7`).
- Shape: ad-hoc DSL2. One anonymous `workflow {}` in `main.nf:71-123` wires all 11 processes defined in `modules.nf` plus the Groovy helper `group_per_sample` (`modules.nf:369-381`). It has no `nextflow_schema.json`, no module `meta.yml`, no nf-test suite and no `test` profile. `scripts/*.sh` are prototypes that the pipeline does not use (`scripts/README.txt`).
- Params, assigned in `main.nf:35-39`: `genome`, `variants`, `denylist`, `reads` and `results`. No param gates a step, so every process always runs.
- Test evidence: in-repo `data/` (57 MB). GitHub CI runs pipeline defaults (replicate `rep1` only) under `-profile docker`, then `validate-ci.sh`, which checks only that output files are non-empty (`.github/workflows/ci.yml`, `validate-ci.sh:6-10`).
- Software evidence: every profile sets the config-level image `quay.io/nextflow/callings-nf:gatk4` (`nextflow.config:8,12,18,29,41`). `docker/Dockerfile` pins GATK 4.1.1.0, STAR 2.5.2b, samtools/htslib 1.3.1, vcftools 0.1.14 and Debian `r-base` with ggplot2/optparse. It is not proven to be the recipe for that image, so treat these versions as indicative.
- Expert intent: `caller-request.md` ("As given" list).

### Scope

#### Included

The expert selected the expansive reading. Every scientific step of the source workflow is in scope:

- **Reference preparation from the genome FASTA:** a FASTA index (`samtools faidx`), a sequence dictionary (`gatk CreateSequenceDictionary`) and a STAR genome index built from the FASTA alone, with no annotation (`modules.nf:17, 37, 56-61`).
- **Known-sites preparation:** remove known variants that fall in denylisted regions (`vcftools --exclude-bed`), then compress and index the result (`modules.nf:84-89`). The filtered set serves as the base-recalibration known sites and as the comparison set.
- **Per-replicate alignment:** two-pass STAR alignment in which pass-1 splice junctions are inserted into pass 2 (`modules.nf:114-134`). Then keep uniquely mapped reads (`NH:i:1`) and index the result (`modules.nf:137-141`).
- **Per-replicate GATK RNA-seq preprocessing:** SplitNCigarReads with `--refactor-cigar-string` (`modules.nf:169-173`), then BaseRecalibrator against the filtered known sites and ApplyBQSR (`modules.nf:204-216`).
- **Per-sample grouping of replicates:** the replicate id loses its trailing `1`/`2` to form the sample id (`modules.nf:200`). All recalibrated BAMs of a sample go to a single calling run (`main.nf:106`, `modules.nf:241`).
- **Per-sample variant calling:** HaplotypeCaller with `--standard-min-confidence-threshold-for-calling 20.0` and `--dont-use-soft-clipped-bases` (`modules.nf:247-253`).
- **VariantFiltration (expert: keep in scope):** cluster window 35 / cluster size 3, `FS > 30.0` (FS) and `QD < 2.0` (QD). These annotate FILTER and do not remove records (`modules.nf:256-261`).
- **Post-processing:**
  - keep PASS records with depth `DP >= 8`, then compare their sites with the filtered known variants (`vcftools --diff-site`, `modules.nf:281-283`);
  - select the called sites that are also known variants (the known-SNP VCF, compressed and indexed);
  - compute per-site alternate allele fractions from the sample's FORMAT field 2 (AD under GATK's usual order) and plot their histogram (`modules.nf:303-316`, `bin/gghist.R`).
- **ASEReadCounter (expert: keep in scope):** per sample, over all of that sample's recalibrated BAMs at the known-SNP sites (`modules.nf:342-348`).

#### Excluded

- The sequence-dictionary `UR:` path rewrite run before HaplotypeCaller (`modules.nf:244`). It works around absolute work-directory paths, not a scientific step. See Open questions.
- Execution-environment configuration: executors, Singularity/Docker run options, memory labels, the `aws` S3 mirror and publish directories (`nextflow.config`). These are not workflow semantics.
- The unused bash prototypes in `scripts/` and the old images described in `docker/README.adoc`.
- `validate-ci.sh`'s exact file-name checks. Two of its names do not match what the pipeline publishes, and without `set -e` only its last check decides the exit status. It is weak evidence of intended outputs, not an acceptance contract.

### Inputs and outputs

Scientific inputs (source-supported formats in parentheses):

- Paired-end RNA-seq reads, one pair per replicate (gzipped FASTQ). The source names files `<sampleID><replicate 1|2>_<mate 1|2>.<ext>` and derives replicate and sample identity from those names (`README.md:39-47`, `main.nf:72`, `modules.nf:200`).
- Reference genome (FASTA). The source builds every index from this file and accepts no prebuilt index.
- Known variants (VCF, bgzipped in the bundled data).
- Denylisted genome regions (BED).

Per-sample outputs, which the source publishes under `results/<sampleId>/` (`modules.nf:271, 293, 329`):

- `final.vcf`: the VariantFiltration call set, with FILTER annotated and no records removed (uncompressed VCF). This is not the PASS/DP8 subset.
- `commonSNPs.diff.sites_in_files`: a site-level comparison of the PASS/DP≥8 calls against the filtered known variants (vcftools diff-site table).
- `known_snps.vcf.gz` + `.tbi`: called sites that are also known variants, with all INFO kept.
- `AF.histogram.pdf`: a histogram of alternate allele fractions at those sites.
- `ASE.tsv`: the ASEReadCounter per-site allele count table.

The source does not publish the intermediates: indexes, aligned and recalibrated BAMs, the raw HaplotypeCaller VCF, the PASS/DP8 VCF and the AF value list.

### Requirements and preferences

- **Expert, strong:** convert the whole pipeline. Every scientific step listed under Scope/Included is selected, and the caller excluded nothing.
- **Expert, strong:** the workflow's test uses both bundled replicates (`rep1` and `rep2`), so that per-sample replicate grouping is actually exercised. The source's default run and CI read only `rep1` (`main.nf:38`). The in-repo two-replicate configuration is the `cluster` profile's `reads = rep*_{1,2}` (`nextflow.config:47`); the summary records it as candidate `profile:cluster`.
- **Expert, strong:** keep GATK ASEReadCounter and VariantFiltration in scope.
- **Expert, strong, an instruction to the downstream design and implementation stages:** search for GATK4 or equivalent Galaxy wrappers for these steps. Any substitute tool, or any drop of either step, must be justified with cited evidence, not assumed. This brief does not search for, assume or choose Galaxy tools or wrappers.
- **Expert:** no Galaxy requirements beyond the above. Datatypes, collection structures, interface labels, tool choices and versions are left to downstream design.
- **Source, preserve:**
  - base recalibration and the post-processing comparison both use the denylist-filtered known variants (`main.nf:99, 110-112`);
  - only uniquely mapped reads continue after alignment;
  - all replicates of a sample feed one calling run and one ASE count run;
  - VariantFiltration annotates and does not remove records, and the PASS/DP≥8 selection happens in post-processing.
- **Source, indicative only:** the tool versions in `docker/Dockerfile` (see Open questions).

### Acceptance criteria

- On the bundled reference, known variants and denylist with both replicates, the workflow completes and yields one sample (`rep`, from `rep1` + `rep2`). That sample's calling and ASE counting each consume both replicates' recalibrated alignments.
- For that sample, each of the five per-sample outputs above exists and is non-empty. The ASE table has data rows for known-SNP sites.
- The filtered call set carries the FS, QD and SnpCluster filter annotations rather than dropping records. The known-SNP set is a subset of the PASS, depth ≥ 8 calls that are also known variants.
- Behaviour matches the source steps listed under Scope, except where an Open question or Decision records an accepted difference. Any tool substitution carries the evidence the expert requires.

### Open questions

- Must outputs match a Nextflow reference run of the source numerically, or only in kind?
  - Proposed: match in kind and scientific behaviour (same steps, filters and output roles); numeric equality is not required. Record any differences from tool versions.
  - Evidence: the repository ships no expected outputs, and CI checks only that files are non-empty. Nextflow and Java are absent in this environment (`environment-probes.txt`), so no reference run exists. The expert asked for an "equivalent" workflow without defining equivalence.
  - Confidence: low
  - Missing: the expert's definition of "equivalent", and whether a reference run of the source is wanted.
- Should the PASS/depth filter reproduce the source's regex quirk or its evident intent?
  - Proposed: implement the intent (FILTER is PASS and INFO DP ≥ 8), and note that the source's perl regex drops records whose DP is the last INFO key.
  - Evidence: `modules.nf:281-283` matches `DP=(\d+);`, which requires a trailing `;`. The source also writes a headerless intermediate VCF (`result.DP8.vcf`) before running `vcftools --diff-site`. That is a portability risk rather than a scientific choice.
  - Confidence: low
  - Missing: whether the expert wants bit-faithful reproduction of source quirks.
- How should the known-SNP subset select sites?
  - Proposed: keep the call-set records whose position also appears in the filtered known variants (sites the diff-site comparison marks as in both files).
  - Evidence: `modules.nf:303-316` turns diff-site POS columns into a BED for `vcftools --bed`. In 0-based BED terms these intervals are zero-length or off by one, so whether the source actually retains those sites is unverified (phase-1 inference).
  - Confidence: low
  - Missing: a run of the source showing how many sites `known_snps.vcf` actually contains.
- Should the read-group sample name stay hard-coded as `GM12878`?
  - Proposed: preserve the source behaviour, with read-group ID per replicate and a constant `SM:GM12878`, so that joint calling over a sample's replicates yields one sample column as in the source.
  - Evidence: `modules.nf:134`. With several samples, a constant SM gives every sample the same VCF sample name. That is harmless to per-sample processing but misleading in the output.
  - Confidence: medium
  - Missing: whether the expert prefers SM to be the derived sample id.
- How is replicate-to-sample identity supplied?
  - Proposed: preserve the semantics. Replicates sharing a sample identity are pooled for calling and ASE counting, and the test pools `rep1` + `rep2` into sample `rep`. How the workflow receives that identity is left to design.
  - Evidence: the source derives the sample id by stripping one trailing `1` or `2` from the file-pair prefix (`modules.nf:200`). Ids ending in other digits stay separate samples (phase-1 inference).
  - Confidence: medium
  - Missing: whether real inputs ever have more than two replicates or other naming.
- Should the workflow handle several samples, each with one or more replicates, or only the single test sample?
  - Proposed: support several samples, each with one or more replicates, as the source does. The test exercises one sample with two replicates.
  - Evidence: every post-alignment step is keyed by sample id (`main.nf:104-122`, `modules.nf:369-381`). The bundled data holds one sample.
  - Confidence: medium
  - Missing: the expert's expected cohort shape.
- Must a sample's replicates be called as separate inputs to one HaplotypeCaller run, or may they be merged into one alignment first?
  - Proposed: either is acceptable, provided all of a sample's replicate reads feed one calling run and one ASE count run with their read groups intact.
  - Evidence: the source passes one `-I` per BAM to HaplotypeCaller and ASEReadCounter (`modules.nf:241, 342-348`).
  - Confidence: medium
  - Missing: whether the expert considers multi-input calling part of "equivalent".
- Should two-pass alignment reproduce the source's manual two passes?
  - Proposed: reproduce the behaviour: an annotation-free index built from the FASTA, pass-1 junctions inserted for pass 2, the source's pass-1 filtering options, and coordinate-sorted output. Any mechanism with that effect is acceptable.
  - Evidence: `modules.nf:56-61, 114-134`. The source uses no GTF or `--sjdbOverhang`. The comment "create a new index" is not what the code does, because junctions are inserted on the fly.
  - Confidence: medium
  - Missing: whether the expert wants an annotation (GTF) added. The source has none.
- Should the sequence-dictionary `UR:` rewrite be reproduced?
  - Proposed: no. Exclude it as an execution workaround.
  - Evidence: `modules.nf:244` rewrites an absolute work-directory path that `CreateSequenceDictionary` recorded, and only before HaplotypeCaller (phase-1 inference).
  - Confidence: medium
  - Missing: none beyond confirmation.
- Must tool versions match the source?
  - Proposed: no. Treat GATK 4.1.1.0, STAR 2.5.2b, samtools 1.3.1 and vcftools 0.1.14 as indicative and record the versions actually used.
  - Evidence: `docker/Dockerfile` pins these, but the profiles use the prebuilt `quay.io/nextflow/callings-nf:gatk4`, whose recipe is unverified. `README.md:15` names yet another image.
  - Confidence: medium
  - Missing: an expert requirement on versions. None was given.
- How should the allele-fraction histogram be produced?
  - Proposed: produce a histogram of alt/(ref+alt) per known-SNP site from the sample's allele depths, excluding sites with a zero count and values equal to 1, as the source does. The plotting tool and image format are left to design. The source's PDF is evidence, not a requirement.
  - Evidence: `modules.nf:303-316` and `bin/gghist.R:1-40` (ggplot2). FORMAT field 2 is assumed to be AD (phase-1 inference).
  - Confidence: medium
  - Missing: whether the expert needs the PDF format or the AF value list as an output.
- Should the test use the bundled inputs at full size?
  - Proposed: yes. Use the bundled chr22 FASTA, known variants, denylist and both replicates unchanged, and build the indexes in the test as the source does.
  - Evidence: `data/` totals 57 MB (FASTA 52 MB, reads about 6 MB across four files). The SHA-1 values are recorded in `phase1-notes.md`. Building the STAR index on 51 Mbp is the heaviest step (not measured).
  - Confidence: medium
  - Missing: a test runtime and size budget.
- Which outputs are workflow outputs?
  - Proposed: the five per-sample published outputs listed under Inputs and outputs (with the `.tbi` alongside the known-SNP VCF). Intermediates are not outputs.
  - Evidence: only POST_PROCESS_VCF, PREPARE_VCF_FOR_ASE and ASE_KNOWNSNPS publish (`modules.nf:271, 293, 329`). `README.md:117-121` lists the same roles.
  - Confidence: high

### Decisions

- Scope is the whole pipeline, expansive reading (expert, `caller-request.md`). Nothing is excluded except the execution-only items under Scope/Excluded, which this brief proposes and the expert may override.
- The test uses both replicates so that replicate grouping is exercised (expert). This overrides the source's default test selection (`pipeline-defaults`, `rep1` only) in favour of the two-replicate inputs (`profile:cluster` in the summary).
- GATK ASEReadCounter and VariantFiltration stay in scope (expert). Wrapper discovery for them, and the evidence for any substitute or drop, belong to downstream design (expert instruction, recorded under Requirements). This brief made no tool search or choice.

### Related artifacts

- `summary-nextflow.json`: structured source summary (processes, channels, edges, params, reference assets, tools and test candidates `pipeline-defaults`, `profile:cluster` and `profile:aws`).
- `phase1-notes.md`: source facts with file:line citations that the summary cannot carry, and test-data sizes and SHA-1 values.
- `caller-request.md`: the expert's request as given and the coordinator's reading.
- `environment-probes.txt`: environment probes from 2026-10-29.

### Blockers

## Agent Environment

Observed on 2026-10-29 by harmless availability and version probes (`environment-probes.txt`). Nothing was installed, pulled or downloaded. The expert stated no tooling or container requirements.

### Tooling

- `foundry`: not on PATH. Available as the run's shim to the worktree build. Its workflow-brief validator carries schema sha256 `8e65acb7…036e0`, matching this bundle (probe exit 0), and validates `summary-nextflow.json`.
- `gxwf`: not on PATH. The worktree's `node_modules/.bin/gxwf` reports version 1.15.0.
- `planemo`: not on PATH. `uvx --from planemo==0.75.47 planemo` reports version 0.75.47. Not observed: whether planemo can obtain and start a Galaxy for testing (needs network access, which was not probed).
- `node` v26.13.0 and `uvx` are present. `nextflow`, `nf-test`, `java`, `conda`, `mamba` and `galaxy-tool-cache` are absent, so the source pipeline cannot be run here as a reference.
- Required versions: none stated by the expert.

### Constraints

- Host: Linux x86_64, 4 CPUs, about 15.7 GB RAM, about 473 GB free disk.
- Brief production ran under a no-install, no-pull, no-download rule. Whether later stages may pull containers, fetch Tool Shed tools or download Galaxy is not stated and not probed.
- Source test data is local in the Foundry worktree fixture (`workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF/data`). The `aws` profile's S3 mirror was not accessed.

### Containerization

- Preference: none stated by the expert. The source runs every step in one all-in-one image, `quay.io/nextflow/callings-nf:gatk4`. That is evidence, not a requirement.
- Docker: 29.1.3 (linux/amd64, overlayfs). `hello-world` ran with `pull=never`, so the engine is usable for local images. One biocontainer image is cached (`quay.io/biocontainers/samtools:1.21--h96c455f_1`). Registry pulls were not attempted, so pull availability is unknown.
- Singularity, Apptainer and Podman are absent. Conda and Mamba are absent, so tool dependencies would have to come from container images.

### Blockers
