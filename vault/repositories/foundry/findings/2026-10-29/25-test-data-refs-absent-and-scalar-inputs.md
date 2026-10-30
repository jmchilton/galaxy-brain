# test-data-refs has no state for an optional input left absent on purpose, and the "one ref per workflow input" rule counts scalars the Mold excludes

- Target: galaxyproject/foundry (`packages/gxwf-foundry/src/schemas/test-data-refs/test-data-refs.schema.json`, `content/molds/find-test-data/index.md` and `eval.md`). Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 6 (find-test-data rev 8, foundry `2f8792a6`), 2026-10-29. Ledger `test-data-refs-no-form-for-absent-optional-or-scalar-inputs` (major). Phase verdict ✅ 2, ❌ 1 (full input coverage).
- Existing issues/PRs: none. Related: #577 (test-plan Mold and resolved refs), #66 (Nextflow test fixtures → job inputs), finding [13](13-test-data-library-layout.md) (same Mold, different gap).

## Symptom
nf-core/atacseq's `conf/test.config` leaves `blacklist_bed`, `gene_bed` and `tss_bed` unset on purpose. The workflow derives gene and TSS BEDs from the GTF and uses an empty-blacklist placeholder. The schema can say only "resolved, here is a location" or "unresolved, with a reason". So the three came out as `resolved: false` with explanatory reasons, which the harness reads as user-supplied gaps. The 33 scalar inputs (`read_length` 50, `mito_name` MT, `fingerprint_bins` 100, ...) have no entry at all. That's 6 of 39 workflow labels covered, and the eval's "full input coverage" property fails although the phase did its job.

## Root cause
Confirmed: the three documents disagree about scope.
- Schema `description`: "Test data for each Galaxy workflow input ... One ref per workflow input". `refs.description`: "One entry per workflow input label". A `Ref` requires `fixture` and `collection_shape`/`datatype`, and `resolved` is boolean. There's no `omitted` state and no `value` field.
- `find-test-data/eval.md:20-24` (full input coverage): "every workflow input label has exactly one entry; each entry is either resolved ... or marked `resolved: false`".
- `find-test-data/index.md:88`: "Resolve the *data*; leave analysis parameters (factors, thresholds, reference levels, top-N) to the design Molds". Scalars are explicitly out of the Mold's scope, so the eval it's scored against can't pass on any workflow with parameter inputs.
- An absent optional data input is a legitimate test choice that has nowhere to go. It's neither a fixture nor a gap.

## Proposed fix
1. Scope the refs to **data inputs**. Say so in the schema descriptions and the eval ("every data/collection workflow input"). Scalar job values stay with the test plan, which already binds them. The alternative, an optional `value` field for scalars, would make this Mold own parameter choices that line 88 gives to the design Molds.
2. Add a third state for an optional data input left unset on purpose: e.g. `resolved: true`, `fixture.storage: "omitted"`, a required `reason` citing the source (`conf/test.config` sets none), and `datatype` kept. implement-galaxy-workflow-test then omits the key from the job. Harness and eval treat it as covered, not as a user-supplied gap.
3. Add an eval case with one omitted optional input and one scalar input.

## Draft issue
**Title:** test-data-refs: no state for an intentionally absent optional input; coverage rule counts scalar inputs find-test-data must not resolve

In an nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29), find-test-data could cover only 6 of 39 workflow input labels and failed its own "full input coverage" property:

- `blacklist_bed`, `gene_bed` and `tss_bed` are optional and unset in the source test profile on purpose. The schema allows only resolved-with-location or `resolved: false`, so they were emitted as unresolved gaps and read downstream as user-supplied data that is missing.
- 33 scalar inputs (`read_length`, `mito_name`, `fingerprint_bins`, ...) have no form in the schema. The Mold itself says to "leave analysis parameters ... to the design Molds" (`index.md:88`), but the schema ("one ref per workflow input") and the eval ("every workflow input label has exactly one entry") count them.

Proposal: scope refs and the coverage property to data/collection inputs (scalars stay with the test plan), and add an `omitted` fixture state for optional inputs left unset on purpose, with a cited reason, which implement-galaxy-workflow-test drops from the job. Add an eval case for each.
