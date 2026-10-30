# Non-tool callers of get_converted_dataset assert on requests with no current history

- Area: lib/galaxy/model (DatasetInstance conversions), visualization, datasets service, users API
- Found while: [[Component - Implicit Dataset Conversion]]
- Galaxy SHA: 65e6daff
- Severity: medium

## Problem

`DatasetInstance.get_converted_dataset(trans, target_ext, history=None, ...)` (`lib/galaxy/model/__init__.py:5917`) forwards `history` to `converter.execute`. When it is `None`, `DefaultToolAction._collect_inputs` (`lib/galaxy/tools/actions/__init__.py:453-454`) falls back to `trans.get_history(create=True)` and `execute` does `assert history` (`:536`).

- FastAPI `SessionRequestContext.get_history` ignores `create` (`lib/galaxy/work/context.py:67-68`). The history is `None` when there is no session (`api/__init__.py:370-373, 397-405`).
- Legacy `GalaxyWebTransaction.get_or_create_default_history` starts with `assert self.galaxy_session` (`lib/galaxy/webapps/base/webapp.py:969`).
- So any caller that omits `history=` raises a bare `AssertionError` (HTTP 500) on an API-key request whenever a new conversion must start.

Callers with this shape at this SHA (only the first has an issue, #24529):

- `webapps/galaxy/api/users.py:580-581` custom build from FASTA (`PUT /api/users/{id}/custom_builds/{key}`).
- `webapps/galaxy/services/datasets.py:984` `GET /api/datasets/{id}/converted/{ext}`.
- `webapps/galaxy/services/datasets.py:1063` `?data_type=features`; `visualization/data_providers/registry.py:113-114` (`data`, `raw_data`, `converted_datasets_state`); `model/__init__.py:6173` via `get_datasources`.
- `visualization/genomes.py:322-323, 398, 402` (`GET /api/genomes/{id}`, `?reference=true`, `/sequences`).
- `managers/dbkeys.py:143` `get_chrom_info`, reached during legacy `POST /api/tools` when an input dbkey is a FASTA-defined custom build whose `len` conversion is missing. The job has a history, but it isn't passed down.
- `model/__init__.py:5906-5915` `get_converted_dataset_deps` has no `history` parameter at all.

Even in the browser, the fallback puts the converted HDA in the user's current history, not the original dataset's history.

## Evidence / repro

- Traced in code only, except for #24529, which includes a red API test.
- No API test calls `/api/datasets/{id}/converted/{ext}` (`grep -rn converted lib/galaxy_test/api/test_datasets.py` is empty). The API suite uses API keys, so a test with a fresh conversion would show the 500.

## Suggested fix

Make the target history explicit instead of relying on `trans`:

- Default `get_converted_dataset` to the original HDA's own history when the requesting user owns it, else the user's current or most recent owned history.
- Raise a `MessageException` (not `assert`) when none can be resolved.
- Add `history` to `get_converted_dataset_deps`.
- Add API tests for `/converted/{ext}` and the FASTA custom build.

#24529's proposed fix covers only `users.py`.

## Related

- Issue #24529
- `vault/repositories/galaxy/branches/active/issue_24529_custom_build_fasta_history_26.0/`
- `vault/repositories/galaxy/branches/active/converted_dataset_lookup_via_manager_26.0/`
