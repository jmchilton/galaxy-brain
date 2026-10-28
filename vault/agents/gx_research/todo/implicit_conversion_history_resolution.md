# Component - Implicit Dataset Conversion

Update the existing note `vault/research/Component - Implicit Dataset Conversion.md`: add how the target history is resolved when `get_converted_dataset` / `converter.execute` runs with `history=None` (fallback to `trans.get_history(create=True)`, which is `None` for API-key requests, then `assert history` in `lib/galaxy/tools/actions/__init__.py`). Catalogue non-tool callers of `get_converted_dataset` that omit `history=` (`webapps/galaxy/api/users.py` custom builds, `managers/dbkeys.py`, `visualization/genomes.py`, `visualization/data_providers/registry.py`, `webapps/galaxy/services/datasets.py`) and which are safe for API-key/no-current-history requests. Also refresh stale line references (`DatasetInstance.get_converted_dataset` now around `model/__init__.py:5549`).

## Why

The custom-build FASTA 500 (#24529) came from a caller with no history; the existing note covers the tool-input path only and says nothing about the no-history case or other callers with the same latent bug.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24529_custom_build_fasta_history_26.0/brain_research.md: needed history-resolution semantics and sibling no-history callers.
