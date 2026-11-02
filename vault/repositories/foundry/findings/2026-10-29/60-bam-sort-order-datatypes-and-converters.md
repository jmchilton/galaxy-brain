# BAM sort-order datatypes and implicit converters are missing from authoring and debug references

- Target: galaxyproject/foundry (`author-galaxy-tool-wrapper`, `content/research/galaxy-tool-job-failure-reference`, `content/research/galaxy-workflow-invocation-failure-reference`). Galaxy behaves as designed here; its reporting gap is finding [59](59-galaxy-job-finish-metadata-failure-hides-cause.md). Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 10 attempt 1 and phase 11 (debug), Galaxy release_26.1, 2026-11-01. Ledgers `debug-references-silent-on-datatype-sort-order-and-implicit-converters` (major), `invocation-failure-reference-silent-on-job-finish-metadata-failure` (major, Foundry half).
- Existing issues/PRs: none in Foundry (searched `qname_sorted`, `Unable to finish job`, `metadata failure`). Related: #672 (user-tool authoring note gaps), finding [61](61-template-resolved-user-tools-skip-step-checks.md) (why the local Mold fix would not have fired in this run).

## Symptom
Five HiC-Pro user tools declared every BAM input `[bam]` and every BAM output `bam`. The name-sorted merge output failed at job finish (finding 59). Separately, Galaxy inserted implicit `CONVERTER_bam_to_coodinate_sorted_bam` jobs (4 counted in the debug report, 12 in the repair decision) in front of `[bam]` inputs fed by Bowtie2's `--reorder` output (`qname_input_sorted.bam`). Those converters would have handed mate-order-dependent HiC-Pro scripts (`mergeSAM.py`, combine mates, valid interactions) coordinate-sorted files: a silent wrong answer, not a red. The debug phase needed Galaxy's `binary.py` and `datatypes_conf.xml.sample` to judge the repair, and found the converter jobs only by grepping planemo.log.

## Root cause
Confirmed in Galaxy release_26.1:
- `bam` is `Bam`; its `set_meta` indexes the file (`lib/galaxy/datatypes/binary.py:937-959`), which requires coordinate order. `qname_input_sorted.bam` (`BamInputSorted`), `qname_sorted.bam` (`BamQuerynameSorted`) and `unsorted.bam` (`BamNative`) only read the header (`datatypes_conf.xml.sample:65-67`).
- `unsorted.bam` declares `to_coordinate_sorted_bam` → `bam`. `Registry.get_converters_by_datatype` (`registry.py:913-926`) gives every subclass its parents' converters, so `qname_sorted.bam` and `qname_input_sorted.bam` also convert to `bam` implicitly when they meet a `[bam]` input. `[unsorted.bam]` accepts all three without conversion.
- Foundry's only mention is `failed_metadata` as a dataset state (`galaxy-tool-job-failure-reference/index.md:68`). No reference covers BAM sort-order types, the indexing side effect, or implicit converter jobs.

## Evidence
- Open-requirements decision `repair-r1-bam-sort-datatypes` (converter jobs in attempt 1; bowtie2 wrapper `change_format` to `qname_input_sorted.bam` under `--reorder`). Attempts 2-5 ran the R1 datatypes with no converter and no metadata failure.
- Phase 11 `workflow-debug-report.md` §4 (converter jobs 48, 50, 57, 59 found in planemo.log only).

## Local Mold fix c7ab66fa — keep, widen
`author-galaxy-tool-wrapper` rev 8 adds the rule (sort order in every BAM format; `[unsorted.bam]` for order-agnostic inputs) and one llm-judged eval property. The facts match Galaxy 26.1 above. Keep it. Gaps:
1. In this run the user tools were written by the template phase, not by `author-galaxy-tool-wrapper`, so the rule would not have fired (finding 61). Put the same rule in `galaxy-user-tool-authoring` (the note every user-tool author reads) and have the Mold cite it, rather than holding it only in the Mold body.
2. "anything else `unsorted.bam`" is right; add that a tool needing coordinate order should take `[bam]` on purpose and let the converter run, so authors don't flip every input to `unsorted.bam`.
3. The Foundry debug half below is not covered by the fix.

## Proposed fix
1. `galaxy-user-tool-authoring` §5 Outputs (and §4 for inputs): the BAM family table above, the indexing side effect, and the converter rule. `author-galaxy-tool-wrapper` cites it (keep c7ab66fa's eval property).
2. `galaxy-tool-job-failure-reference`: a "job-finish / metadata failure" row: `exit_code` null + empty streams + info "Unable to finish job" → read the managed Galaxy log for `set_meta` tracebacks (keep it with `--no_cleanup`); first suspect a declared datatype whose `set_meta` has side effects (`bam` indexing).
3. `galaxy-workflow-invocation-failure-reference`: implicit `CONVERTER_*` jobs appear as extra jobs in the invocation; list them when an order- or format-sensitive tool gives odd output. Link finding 59's upstream issue once filed.

## Draft issue
**Title:** User-tool authoring and debug references: BAM sort-order datatypes, `bam` indexing at finish, and implicit converters

In the nf-core/hic wb2g build (2026-11-01, Galaxy release_26.1) user tools declared every BAM `bam`/`[bam]`. A `samtools sort -n` output declared `bam` failed at job finish because `Bam.set_meta` indexes it ("Unable to finish job", null exit code, empty streams; Galaxy side filed separately). Bowtie2 `--reorder` outputs (`qname_input_sorted.bam`) fed into `[bam]` inputs got implicit `CONVERTER_bam_to_coodinate_sorted_bam` jobs, which would have silently coordinate-sorted data that HiC-Pro reads in mate order.

Proposal: (1) add the BAM family (`bam` = coordinate-sorted and indexed at finish; `qname_sorted.bam`, `qname_input_sorted.bam`, `unsorted.bam` are not; subclasses inherit `unsorted.bam`'s converter to `bam`; `[unsorted.bam]` accepts all without conversion) to `galaxy-user-tool-authoring` and cite it from `author-galaxy-tool-wrapper` (rev 8 already carries the rule); (2) add a job-finish/metadata-failure row to `galaxy-tool-job-failure-reference`; (3) note implicit converter jobs in `galaxy-workflow-invocation-failure-reference`.
