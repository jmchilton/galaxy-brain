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
- Build evidence: build v0 (2026-10-29) carried every Included step and passed its two-replicate test on Galaxy (see Related artifacts). Statements marked "build v0" are observations from that run, not source evidence.

### Scope

#### Included

The expert selected the expansive reading. Every scientific step of the source workflow is in scope:

- **Reference preparation from the genome FASTA:** a FASTA index (`samtools faidx`), a sequence dictionary (`gatk CreateSequenceDictionary`) and a STAR genome index built from the FASTA alone, with no annotation (`modules.nf:17, 37, 56-61`).
- **Known-sites preparation:** remove known variants that fall in denylisted regions (`vcftools --exclude-bed`), then compress and index the result (`modules.nf:84-89`). The filtered set serves as the base-recalibration known sites and as the comparison set.
- **Per-replicate alignment:** two-pass STAR alignment in which pass-1 splice junctions are inserted into pass 2, with the same four filtering options on both passes (`modules.nf:114-134`). Then keep uniquely mapped reads (`NH:i:1`) and index the result (`modules.nf:137-141`).
- **Per-replicate GATK RNA-seq preprocessing:** SplitNCigarReads with `--refactor-cigar-string` (`modules.nf:169-173`; build v0 did not carry the flag, see Open questions), then BaseRecalibrator against the filtered known sites and ApplyBQSR (`modules.nf:204-216`).
- **Per-sample grouping of replicates:** the replicate id loses its trailing `1`/`2` to form the sample id (`modules.nf:201`). All recalibrated BAMs of a sample go to a single calling run (`main.nf:106`, `modules.nf:241`).
- **Per-sample variant calling:** HaplotypeCaller with `--standard-min-confidence-threshold-for-calling 20.0` and `--dont-use-soft-clipped-bases` (`modules.nf:247-253`).
- **VariantFiltration (expert: keep in scope):** cluster window 35 / cluster size 3, `FS > 30.0` (FS) and `QD < 2.0` (QD). These annotate FILTER and do not remove records (`modules.nf:256-261`).
- **Post-processing:**
  - keep PASS records with depth `DP >= 8`, then compare their sites with the filtered known variants (`vcftools --diff-site`, `modules.nf:281-283`);
  - select the called sites that are also known variants (the known-SNP VCF, compressed and indexed);
  - compute per-site alternate allele fractions from the sample's FORMAT field 2 (AD under GATK's usual order) and plot their histogram (`modules.nf:303-316`, `bin/gghist.R`).
- **ASEReadCounter (expert: keep in scope):** per sample, over all of that sample's recalibrated BAMs at the known-SNP sites (`modules.nf:342-348`).

#### Excluded

- The sequence-dictionary `UR:` path rewrite run before HaplotypeCaller (`modules.nf:244`). It works around absolute work-directory paths, not a scientific step. See Decisions.
- Execution-environment configuration: executors, Singularity/Docker run options, memory labels, the `aws` S3 mirror and publish directories (`nextflow.config`). These are not workflow semantics.
- The unused bash prototypes in `scripts/` and the old images described in `docker/README.adoc`.
- `validate-ci.sh`'s exact file-name checks. Two of its names do not match what the pipeline publishes, and without `set -e` only its last check decides the exit status. It is weak evidence of intended outputs, not an acceptance contract.

### Inputs and outputs

Scientific inputs (source-supported formats in parentheses):

- Paired-end RNA-seq reads, one pair per replicate (gzipped FASTQ). The source names files `<sampleID><replicate 1|2>_<mate 1|2>.<ext>` and derives replicate and sample identity from those names (`README.md:39-47`, `main.nf:72`, `modules.nf:201`).
- Reference genome (FASTA). The source builds every index from this file and accepts no prebuilt index.
- Known variants (VCF, gzipped in the bundled data).
- Denylisted genome regions (BED).

Bundled test-data facts (checked 2026-10-29, build v0):

- `data/known_variants.vcf.gz` is plain gzip, not BGZF (header bytes `1f8b 0808`, no BGZF extra field): VCFv4.1, one contig `chr22`. Tools that need a tabix-indexable file must recompress it; build v0 decompressed it on upload.
- `data/denylist.bed` has 6 columns, name labels containing `/` and parentheses, and contigs beyond `chr22`.
- Reads are 76 bp, Phred+33: `rep1` 27,816 pairs, `rep2` 18,736 pairs. `genome.fa` is chr22 only (52,159,650 bytes).

Per-sample outputs, which the source publishes under `results/<sampleId>/` (`modules.nf:271, 293, 329`):

- `final.vcf`: the VariantFiltration call set, with FILTER annotated and no records removed (uncompressed VCF). This is not the PASS/DP8 subset.
- `commonSNPs.diff.sites_in_files`: a site-level comparison of the PASS/DP≥8 calls against the filtered known variants (vcftools diff-site table).
- `known_snps.vcf.gz` + `.tbi`: called sites that are also known variants, with all INFO kept.
- `AF.histogram.pdf`: a histogram of alternate allele fractions at those sites. The image format is open (see Open questions); build v0 produced PNG.
- `ASE.tsv`: the ASEReadCounter per-site allele count table.

The source does not publish the intermediates: indexes, aligned and recalibrated BAMs, the raw HaplotypeCaller VCF, the PASS/DP8 VCF and the AF value list (`modules.nf:276-277, 297-299`).

### Requirements and preferences

- **Expert, strong:** convert the whole pipeline. Every scientific step listed under Scope/Included is selected, and the caller excluded nothing.
- **Expert, strong:** the workflow's test uses both bundled replicates (`rep1` and `rep2`), so that per-sample replicate grouping is actually exercised. The source's default run and CI read only `rep1` (`main.nf:38`). The in-repo two-replicate configuration is the `cluster` profile's `reads = rep*_{1,2}` (`nextflow.config:47`); the summary records it as candidate `profile:cluster`.
- **Expert, strong:** keep GATK ASEReadCounter and VariantFiltration in scope.
- **Expert, strong, an instruction to the downstream design and implementation stages:** search for GATK4 or equivalent Galaxy wrappers for these steps. Any substitute tool, or any drop of either step, must be justified with cited evidence, not assumed. This brief does not choose Galaxy tools; the wrapper evidence below is what build v0 found.
- **Expert:** no Galaxy requirements beyond the above. Datatypes, collection structures, interface labels, tool choices and versions are left to downstream design.
- **Source, preserve:**
  - base recalibration and the post-processing comparison both use the denylist-filtered known variants (`main.nf:99, 110-112`);
  - only uniquely mapped reads continue after alignment;
  - all replicates of a sample feed one calling run and one ASE count run;
  - VariantFiltration annotates and does not remove records, and the PASS/DP≥8 selection happens in post-processing.
- **Source, indicative only:** the tool versions in `docker/Dockerfile` (see Decisions).

Wrapper evidence (main Tool Shed and `galaxyproject/tools-iuc`, searched 2026-10-29 in build v0; `gatk-wrapper-search.md` in that run):

- GATK4: iuc `gatk4` 4.6.2.0+galaxy1 wraps SplitNCigarReads, BaseRecalibrator, ApplyBQSR and HaplotypeCaller (plus Mutect2). tools-iuc `tools/gatk4/` holds no other sub-command, and no open PR adds one. These wrappers build the FASTA index and sequence dictionary inside each job from a history FASTA, so they need no separate index or dictionary input. HaplotypeCaller accepts several BAMs in one run, and its RNA mode sets exactly the source's two calling flags. BaseRecalibrator's known sites must be bgzipped and tabix-indexed.
- VariantFiltration: no GATK4 wrapper. The only wrappers, `gatk2_variant_filtration` 2.8.0 (iuc/gatk2, lz_hust/gatktools) and devteam `gatk_variant_filtration` 0.0.5 (GATK 1.4), need a licensed GATK jar through a site path and cannot run from a biocontainer; bioconda has no `gatk2`. `bcftools filter` and SnpSift can express the FS and QD filters but have no SnpCluster equivalent.
- ASEReadCounter: no wrapper in any GATK generation and no tools-iuc PR. Count-type tools (bam-readcount, `bcftools mpileup -a AD`, varscan readcount, BayesASE) do not produce its table.
- Build v0 therefore ran both steps as locally authored tools that execute the source's exact `gatk VariantFiltration` and `gatk ASEReadCounter` commands (`modules.nf:256-261, 344-348`) with GATK 4.6.2.0, the same version and container as the iuc GATK4 wrappers. That is neither a substitute nor a drop; the test confirmed the FS, QD and SnpCluster annotations and a populated ASE table.
- `vcftools --diff-site` has no Tool Shed wrapper (devteam `vcftools_compare` runs `vcf-compare`, a different report); build v0 ran the source command with vcftools 0.1.17 the same way.
- SplitNCigarReads: the iuc wrapper runs a fixed command with no parameter for `--refactor-cigar-string`, and it is the only SplitNCigarReads wrapper. GATK 4.6.2.0 still has the flag (`-fixNDN`, default off; meant for N-D-N CIGARs from TopHat2 with transcriptomes).
- STAR: the iuc `rna_star` 2.7.11b wrapper builds an annotation-free index per job from a history FASTA, has a built-in two-pass mode, fixes coordinate-sorted BAM output and writes unique-hit MAPQ 60 by default (STAR's own default, which the source uses, is 255).
- Histogram: of the Tool Shed histogram wrappers, only csvtk_plot plots one named column of a headed table and survives a header-only table; it writes PNG only. ggplot2_histogram plots every column; devteam histogram exits on a table with fewer than two data rows.
- Known-SNP selection: no Tool Shed wrapper gives strict CHROM+POS equality between two VCFs while keeping the first file's full records. bedtools intersect `-u` matches reference-span overlap; vcflib vcfintersect matches alleles within a window; bcftools isec emits a sites list.

### Acceptance criteria

- On the bundled reference, known variants and denylist with both replicates, the workflow completes and yields one sample (`rep`, from `rep1` + `rep2`). That sample's calling and ASE counting each consume both replicates' recalibrated alignments.
- For that sample, each of the five per-sample outputs above exists and is non-empty. The ASE table has data rows for known-SNP sites. ASEReadCounter counts only biallelic heterozygous SNP sites, so it can have fewer rows than the known-SNP set has records (build v0: 52 rows from 60 records).
- The filtered call set carries the FS, QD and SnpCluster filter annotations rather than dropping records. The known-SNP set is a subset of the PASS, depth ≥ 8 calls that are also known variants.
- Behaviour matches the source steps listed under Scope, except where an Open question or Decision records an accepted difference. Any tool substitution carries the evidence the expert requires.

### Open questions

- Must outputs match a Nextflow reference run of the source numerically, or only in kind?
  - Proposed: match in kind and scientific behaviour (same steps, filters and output roles); numeric equality is not required. Record any differences from tool versions.
  - Evidence: the repository ships no expected outputs, and CI checks only that files are non-empty. Nextflow and Java are absent in this environment, so no reference run exists. The expert asked for an "equivalent" workflow without defining equivalence. Build v0 measured, for sample `rep`: 572 filtered records, 410 PASS (FILTER values SnpCluster 135, QD 28, FS 3); 189 PASS, DP≥8 calls, of which the comparison marks 59 in both files, 129 in the calls only and 1 overlapping; 60 known-SNP records; 52 ASE rows. These are reference values for later builds, not a source comparison.
  - Confidence: low
  - Missing: the expert's definition of "equivalent", and whether a reference run of the source is wanted.
- How should the known-SNP subset select sites?
  - Proposed: keep the call-set records at exactly the positions the diff-site comparison marks as in both files (`B`), with all INFO kept. Matching by overlapping reference span is not equivalent.
  - Evidence: `modules.nf:303-305` writes the `B` rows' CHROM, POS1 and POS2 as BED intervals for `vcftools --bed`; in 0-based BED terms these are zero-length, so whether the source retains those sites is unverified (it was never run here). Build v0 selected by reference-span overlap: 59 of its 60 known-SNP records are `B` rows; the 60th, chr22:17637975 (`T>TACACAC`), overlaps a known `T>TACACACAC` and is an `O` row (surrendered gap). No Tool Shed wrapper does strict position matching (see Requirements).
  - Confidence: low
  - Missing: a run of the source showing which sites `known_snps.vcf` actually contains; whether near-miss indels should be kept.
- Should the workflow handle several samples, each with one or more replicates, or only the single test sample?
  - Proposed: support several samples, each with one or more replicates, as the source does. The test exercises one sample with two replicates.
  - Evidence: every post-alignment step is keyed by sample id (`main.nf:104-122`, `modules.nf:369-381`). The bundled data holds one sample. Build v0 was designed for several samples but tested only one, so separation across samples is untested.
  - Confidence: medium
  - Missing: the expert's expected cohort shape; a second test sample (none is bundled).
- Must SplitNCigarReads refactor N-D-N CIGAR runs (`--refactor-cigar-string`) as the source requests?
  - Proposed: not required. The flag collapses N-D-N CIGAR runs, which STAR two-pass output is not expected to contain; record its absence. If a run shows such reads, set the flag with an authored step on the same GATK4 version.
  - Evidence: `modules.nf:169-173` sets the flag. The only SplitNCigarReads wrapper does not expose it (see Requirements), so build v0 dropped it (cited drop). Its outputs were not checked for N-D-N CIGARs.
  - Confidence: medium
  - Missing: a check of STAR output on the bundled reads for N-D-N CIGARs; expert confirmation that the drop is acceptable.
- What should a sample with no known-SNP sites produce?
  - Proposed: complete with an empty or header-only known-SNP set, histogram and ASE table, rather than fail the sample.
  - Evidence: the source has no guard; `bgzip`, `gghist.R` and ASEReadCounter run on whatever `known_snps.vcf` holds (`modules.nf:305-316, 344-348`). The bundled sample has 60 known-SNP sites, so build v0 never ran the empty case; its histogram tool was shown to accept a header-only table, and ASEReadCounter on an empty sites file is untested (surrendered gap).
  - Confidence: low
  - Missing: whether the expert wants empty outputs or a skipped sample; a test fixture without known-SNP overlap.
- In what form should the allele-fraction histogram be delivered, and is the allele-fraction value list an output?
  - Proposed: any image format; PNG is accepted. The value list stays an intermediate, as in the source.
  - Evidence: the source writes PDF via ggplot2 (`modules.nf:313`, `bin/gghist.R:1-40`) and does not publish `AF.4R` (`modules.nf:297-299`). Build v0 produced PNG because the only suitable Tool Shed histogram wrapper writes PNG (see Requirements). It recommended exposing the value list as an extra output so tests can check the computation, since an image cannot be content-checked; that recommendation is not applied, because it adds an output the source does not publish, and is left to the expert here.
  - Confidence: medium
  - Missing: whether the expert needs PDF, and whether the AF value list may be added as a checkable output.

### Decisions

- Scope is the whole pipeline, expansive reading (expert, `caller-request.md`). Nothing is excluded except the execution-only items under Scope/Excluded, which this brief proposes and the expert may override.
- The test uses both replicates so that replicate grouping is exercised (expert). This overrides the source's default test selection (`pipeline-defaults`, `rep1` only) in favour of the two-replicate inputs (`profile:cluster` in the summary).
- GATK ASEReadCounter and VariantFiltration stay in scope (expert). The wrapper search the expert required was done in build v0 (see Requirements): neither step has a runnable Galaxy wrapper, and both ran the source's exact GATK4 commands, so there was no substitute and no drop.
- The PASS/depth filter implements the source's intent: FILTER is PASS and INFO DP ≥ 8, with the VCF header kept. The source's perl regex (`modules.nf:281`) needs a `;` after the DP value, so it would drop a record whose DP is the last INFO key, and it writes a headerless intermediate; neither quirk is reproduced. In build v0's output DP is never the last INFO key among the 410 PASS records, so the difference did not arise. Proven in build v0 (green test asserted the known-SNP set holds only PASS, DP ≥ 8 calls). Was an open question (low) at v0.
- The read-group sample name stays the constant `SM:GM12878`, with read-group ID per replicate (`modules.nf:134`), so joint calling over a sample's replicates yields one sample column. With several samples every output then carries the same VCF sample name; sample identity comes from the workflow's sample id, not the VCF column. Proven in build v0 (green test asserted the single `GM12878` column). Was an open question (medium) at v0; the expert may still prefer SM to be the sample id.
- Replicate-to-sample identity is preserved as semantics: replicates sharing a sample identity are pooled for calling and ASE counting, and the test pools `rep1` + `rep2` into sample `rep`. The source derives the id by stripping one trailing `1` or `2` (`modules.nf:201`); how the workflow receives the identity is left to design, and build v0 supplied it explicitly instead of parsing file names. Proven in build v0 (green test). Was an open question (medium) at v0.
- A sample's replicates are separate inputs to one HaplotypeCaller run and one ASEReadCounter run, read groups intact, as in the source (`modules.nf:241, 342-348`); no merge first. Proven in build v0: the green test asserted HaplotypeCaller's recorded command line has exactly two inputs, and the ASEReadCounter job ran with both. Was an open question (medium) at v0.
- Two-pass alignment reproduces the source's behaviour: an annotation-free index built from the FASTA, pass-1 junctions inserted for pass 2, the source's four filtering options on both passes (`modules.nf:118-121, 128-131`), and coordinate-sorted output. Any mechanism with that effect is acceptable; no GTF is added. Proven in build v0 (green test). Build v0 kept unique-hit MAPQ 60 where the source has STAR's 255; the effect on GATK read filtering was not measured. Was an open question (medium) at v0.
- The sequence-dictionary `UR:` rewrite (`modules.nf:244`) is excluded as an execution workaround. Build v0 ran every GATK step without it (green test; cited drop). Was an open question (medium) at v0.
- Tool versions need not match the source. GATK 4.1.1.0, STAR 2.5.2b, samtools 1.3.1 and vcftools 0.1.14 are indicative; record the versions used. Build v0 used GATK 4.6.2.0, STAR 2.7.11b and vcftools 0.1.17 (green test). Was an open question (medium) at v0.
- The allele fraction per known-SNP site is alt/(ref+alt) from the sample's allele depths (AD, read by name), excluding sites where both counts are 0 and values equal to 1, as the source does (`modules.nf:307-311`). Proven in build v0 (green test; the histogram was produced, its values were not checked). The output form stays open (see Open questions). Was part of an open question (medium) at v0.
- The test uses the bundled chr22 FASTA, known variants, denylist and both replicates unchanged, and builds the indexes in the test as the source does. Proven in build v0: about 8.5 minutes of jobs (24 jobs; STAR about 75 s per replicate including its index build, about 1.9 GB RAM each). Was an open question (medium) at v0.
- The workflow outputs are the five per-sample published outputs listed under Inputs and outputs (with the `.tbi` alongside the known-SNP VCF); intermediates are not outputs (`modules.nf:271, 293, 329`, `README.md:117-121`). Proven in build v0 (green test asserted all five). Was an open question (high) at v0.

### Related artifacts

- `summary-nextflow.json`: structured source summary (processes, channels, edges, params, reference assets, tools and test candidates `pipeline-defaults`, `profile:cluster` and `profile:aws`).
- `phase1-notes.md`: source facts with file:line citations that the summary cannot carry, and test-data sizes and SHA-1 values.
- `caller-request.md`: the expert's request as given and the coordinator's reading.
- `environment-probes.txt`: environment probes from 2026-10-29 (seed).
- Build v0 run: `~/foundry-runs/prose-wb2g-callings-v0-2026-10-29/` (planemo green on attempt 5; ledger `open-requirements.ledger.yml`; wrapper search `gatk-wrapper-search.md`; test-data checksums in `test-data-refs.json`; kept test outputs and `measurements.json` under `.scratch/test-outputs/`).

### Blockers

## Agent Environment

Observed on the agent host from the build v0 preflight (2026-10-29T17:17Z, `preflight.md`) and the build v0 run, unless marked as requirements or unknowns. The expert stated no tooling or container requirements.

### Tooling

- `gxwf` and `galaxy-tool-cache`: not on PATH globally; run from the Foundry worktree's `node_modules/.bin` (1.15.0).
- `foundry`: not on PATH globally; a worktree build runs through a node shim (node v26.13.0).
- `planemo`: not on PATH; 0.75.47 runs through `uvx --from planemo==0.75.47`. `~/.planemo/gx_venv_3_release_26.1` was reused and healthy; Galaxy `release_26.1` (26.1.3.dev0) started in about 68 s.
- planemo 0.75.47's own `planemo test` fails with a `KeyError` on a workflow that embeds a user-defined tool. Build v0 ran such a workflow green by another route: `planemo serve` a Galaxy, create a non-admin user holding a role named `user_tool_execute` (`POST /api/roles`), then `planemo test --engine external_galaxy`. A Galaxy served on an empty tool directory lacks stock tools such as `Filter1`; stage the ones the workflow uses.
- Galaxy `release_26.1`: in a workflow job, a nested-list collection reduced into a user-defined tool's multiple-data input reaches the tool's template as a list holding one object keyed by element identifier, not a flat list of files; the template must flatten it. Build v0's attempt 2 failed on this.
- Galaxy `release_26.1` converts `vcf` to `vcf_bgzip` implicitly (bgzip plus tabix metadata) for inputs that need it. `gxwf validate --connections` does not check datatype compatibility.
- Nextflow, nf-test, a Java runtime, conda, Singularity and Apptainer are absent. The source pipeline cannot be run here as a reference.
- Tool Shed, GitHub and quay.io are reachable.
- Required versions: none stated by the expert. Galaxy no older than `release_26.1` for builds (orchestrator constraint).

### Constraints

- Host: Linux x86_64, 4 CPUs, 14.6 GiB RAM plus 16 GiB swap (swap added after build v0; the run had none), about 472 GiB free disk. Other pipeline runs share the host.
- `/tmp` is a RAM-backed tmpfs. Point `TMPDIR` for planemo at a short on-disk path (build v0: `/var/tmp/cgt5`). Under `/tmp`, Galaxy and its job files compete with jobs for RAM; a long path breaks Galaxy's celery worker (its AF_UNIX socket path exceeds the limit), so uploads hang.
- STAR builds its chr22 index in about 1.9 GB per job. Build v0's attempt 3 lost both STAR jobs to the OOM killer while another run's Galaxy used most of the RAM; avoid overlapping heavy planemo tests.
- The green planemo attempt took about 10 minutes end to end (24 jobs, about 509 s first job to last, one local job worker).
- Brief production installs nothing, pulls no containers and downloads no data. Workflow builds may fetch test data and Tool Shed tools and pull the containers the workflow test needs.
- Source test data is local in the Foundry worktree fixture (`workflow-fixtures/pipelines/CRG-CNAG__CalliNGS-NF/data`). The `aws` profile's S3 mirror was not accessed.
- `make fixtures-iwc` exits 2 (gxwf convert-tree fails on uncached tools) but writes all 120 IWC workflows.

### Containerization

- Preference: none stated by the expert. The source runs every step in one all-in-one image, `quay.io/nextflow/callings-nf:gatk4`. That is evidence, not a requirement.
- Docker 29.1.3, native amd64; registry pulls from quay.io work. Build v0 used biocontainers, including the mulled GATK 4.6.2.0 + samtools 1.23 + tabix image that the iuc GATK4 wrappers resolve to, and `vcftools:0.1.17`.
- Singularity, Apptainer and Podman are absent. Conda and Mamba are absent from PATH; planemo can still provision its own conda, so this does not by itself require containers.

### Blockers
