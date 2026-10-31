# galaxy-tool-util staging creates a test `sample_sheet` collection without `column_definitions`

- Target: galaxyproject/galaxy (`lib/galaxy/tool_util/client/staging.py`, `lib/galaxy/tool_util/cwl/util.py`; shipped to planemo as galaxy-tool-util). Planemo only calls it. Foundry tracking needed: yes, label `upstream/galaxy`; it fits as a comment on Foundry #579 (sample_sheet `rows:` job shape).
- Seen in: driver probe for /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30 (`../prose-wb2g-chipseq-v0-2026-10-30.bin/probe/PROBE_RESULTS.md`, `sheet_cd.gxwf.yml`), planemo master 2a815808 + galaxy-tool-util 26.1.2, Galaxy release_26.1, 2026-10-30. Not in the feedback ledger.
- Existing issues/PRs: none in galaxyproject/galaxy (searched "column_definitions staging", "sample_sheet staging"). Foundry #579 (job shape undocumented), #185 (closed: gxformat2 import keeps `column_definitions`).

## Symptom
A workflow test stages a `sample_sheet:paired_or_unpaired` input with `rows:`. The collection is created and the rows are there, but it has no `column_definitions`, even though the workflow input declares typed columns. So row values aren't type-validated, and `__SAMPLE_SHEET_TO_TABULAR__` with `include_headers: true` emits no header line (the one failing probe assertion). The chipseq design then had to use positional columns and `include_headers: false`.

## Root cause
Confirmed in source (release_26.1; unchanged on dev).
- `replacement_collection` (`lib/galaxy/tool_util/cwl/util.py:359-372`) passes only `rows` for `sample_sheet*` types (`:366-367`).
- `create_collection_func` (`lib/galaxy/tool_util/client/staging.py:254-269`) posts `element_identifiers`, `collection_type`, `fields`, `rows`, but no `column_definitions`. The API accepts `column_definitions` on collection creation (`lib/galaxy/schema/schema.py:1095`, `:1306`).
- Neither reads `column_definitions` from the job or from the workflow input definition.

## Evidence
Probe run 2: `sheet_cd` case fails only on the expected header `element_identifier\tsample\t...`; the `sheet_nocd` case and the headerless check pass. Row values staged correctly (`WT_INPUT_REP1_T1\tWT_INPUT\t1\t\t\t`).

## Proposed fix
Accept `column_definitions` in the job value next to `rows`, pass it through `replacement_collection` and `create_collection_func`; better, default it from the target workflow input's `column_definitions` when the job omits it. Add a staging test with `include_headers: true`.

## Draft issue
**galaxy — Title:** Test staging creates sample_sheet collections without column_definitions

`galactic_job_json` stages a `sample_sheet*` collection from a job's `rows:` but never sends `column_definitions`: `replacement_collection` (`tool_util/cwl/util.py:366`) passes only `rows`, and `create_collection_func` (`tool_util/client/staging.py:254-269`) has no such field, although `POST /api/dataset_collections` accepts it. In planemo workflow tests the staged sheet therefore has no column definitions, even when the workflow input declares them: values aren't validated, and `__SAMPLE_SHEET_TO_TABULAR__` with `include_headers: true` writes no header.

Reproduce (planemo master, Galaxy release_26.1): workflow input `samples` of type `sample_sheet:paired_or_unpaired` with `column_definitions` (sample string, replicate int, ...), one `__SAMPLE_SHEET_TO_TABULAR__` step with `include_headers: true`; job `samples: {class: Collection, collection_type: sample_sheet:paired_or_unpaired, rows: {...}, elements: [...]}`. Output has no header line.

Suggested fix: take `column_definitions` from the job (and/or the workflow input) and include it in the create payload.

**Foundry comment for #579 (label `upstream/galaxy`):**
> When documenting the `rows:` job shape: staging currently drops `column_definitions` (upstream: <link>), so tests can't rely on typed validation or on `include_headers: true`. Use positional columns with `include_headers: false` until that's fixed. Seen in the nf-core/chipseq wb2g probe, 2026-10-30.
