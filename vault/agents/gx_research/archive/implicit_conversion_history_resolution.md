# Component - Implicit Dataset Conversion

Update the existing note `vault/research/Component - Implicit Dataset Conversion.md`: add how the target history is resolved when `get_converted_dataset` / `converter.execute` runs with `history=None` (fallback to `trans.get_history(create=True)`, which is `None` for API-key requests, then `assert history` in `lib/galaxy/tools/actions/__init__.py`). Catalogue non-tool callers of `get_converted_dataset` that omit `history=` (`webapps/galaxy/api/users.py` custom builds, `managers/dbkeys.py`, `visualization/genomes.py`, `visualization/data_providers/registry.py`, `webapps/galaxy/services/datasets.py`) and which are safe for API-key/no-current-history requests. Also refresh stale line references (`DatasetInstance.get_converted_dataset` now around `model/__init__.py:5549`).

## Why

The custom-build FASTA 500 (#24529) came from a caller with no history; the existing note covers the tool-input path only and says nothing about the no-history case or other callers with the same latent bug.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24529_custom_build_fasta_history_26.0/brain_research.md: needed history-resolution semantics and sibling no-history callers.
- vault/repositories/galaxy/branches/active/converted_dataset_lookup_via_manager_26.0/brain_research.md: also needs the full caller list of `get_converted_dataset` / `get_converted_files_by_type` / `implicitly_converted_datasets` (incl. `display_applications/parameters.py`, `registry.find_conversion_destination_for_dataset_by_extensions`, `serialize_converted_datasets`) and whether existing conversions are checked against the requesting user's accessibility (open question 3 in the note).

## Debrief

- **Updated** `vault/research/Component - Implicit Dataset Conversion.md` (revision 3 → 4), verified against Galaxy `origin/dev` @ `65e6daff`.
- **Correction to the request**: at this SHA `DatasetInstance.get_converted_dataset` is at `model/__init__.py:5917`, not ~5549. All line refs in the note were refreshed. The explicit conversion route is `POST /api/tools/{tool_id}/convert` (the note previously said `/conversion`).
- **Covered**:
  - New section 4.4 on target-history resolution for `history=None`. It follows the fallback through `_collect_inputs` → `get_default_history_by_trans` → `trans.get_history(create=True)` → `assert history`, with a table per transaction type. FastAPI `SessionRequestContext` ignores `create`. The legacy WSGI default-history path asserts `galaxy_session`. Browser sessions land in the current history, not the dataset's own. Tool-request and workflow `WorkRequestContext`s carry the target history.
  - Section 15 is a full caller catalogue with a no-history-safe column. It covers every `get_converted_dataset` caller, including `get_converted_dataset_deps`, `get_datasources`/`convert_dataset`, `dbkeys.get_chrom_info` during legacy tool runs, genomes `chroms`/`reference`, data providers, `/converted/{ext}` and features. It also lists converter runs that bypass it (display apps pass `history=data.history`, the legacy edit-attributes conversion, `/convert`) and the read-only lookups (`get_converted_files_by_type`, `implicitly_converted_datasets`, `find_conversion_destination_for_dataset_by_extensions`, `serialize_converted_datasets`, FASTQ `fqtoc`).
  - Section 16 says which object is access-checked: converted vs original, per path. It answers part of open question 3.
  - #24529 is open with no fix; its approach is labelled as proposed (15.3).
- **For the requesters**:
  - `issue_24529_custom_build_fasta_history_26.0`: the sibling callers with the same latent bug are `/api/datasets/{id}/converted/{ext}`, `?data_type=features|data|raw_data|converted_datasets_state`, `/api/genomes/{id}` (+ `reference`, `/sequences`), and `get_chrom_info` on legacy `POST /api/tools`. They only fail when a new conversion must start.
  - `converted_dataset_lookup_via_manager_26.0`: see section 15 for the full caller list and section 16 for the access-check placement.
- **Research issues filed**: `research_issues/implicit-conversion-no-history-callers.md`, `research_issues/implicit-conversion-copies-foreign-hid.md`.
- **Cross-refs**: added a `related_notes` backlink pair with `PR 21842 - Tool Execution Migrated to api jobs` (revision bump). The existing pairs with Dataset Display and Dataset and Collection Access Checks are unchanged.
- **Other findings**: some access-related observations went to a private report (path given to John), not into the repo.
- **Out of scope / not done**:
  - No runtime repro beyond #24529's red test.
  - Collection-level conversion semantics, purge strategy and workflow-extraction handling stay as open questions.
