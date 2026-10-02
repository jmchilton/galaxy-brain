# galaxy#23806 — Add `datasets_mapping.tsv` to exported histories and invocations

- Author: davelopez; head `davelopez:export_mapping_file` at `9b4be14c273`; base `dev` (merge-base `5e6568f4245`)
- Closes #22665 (convenience TSV/CSV mapping of archive files -> history datasets; option C in the issue)
- Labels: kind/enhancement, highlight, area/backend. Not draft. No reviews/comments yet.
- Worktree: `~/projects/worktrees/galaxy/pr/23806` (ghwt)
- Tests run: main clone venv (`~/projects/repositories/galaxy/.venv`) with `PYTHONPATH` = worktree `lib:test`. `test_model_store.py -k "mapping or ro_crate or tar"`: 13 passed, 1 xfailed. Also ran two throwaway probes (removed afterwards; worktree clean).

## Summary

`DirectoryModelExportStore._finalize` now serializes each included dataset once, writes the same dicts to `datasets_attrs.txt` / `.provenance`, and projects them into rows for a new root-level `datasets_mapping.tsv`. The columns are hid, name, exported_file, extension, state, collection_name, tags, annotation, file_size, create_time, update_time. The new module is `lib/galaxy/model/store/datasets_mapping.py`. Both RO-Crate builders (history `_init_crate`, invocation `WorkflowRunCrateProfileBuilder.build_crate`) register the file through `add_mapping_file_to_crate`. Writing is wrapped in a log-and-continue `try/except`.

The design is good. Projecting from the already-serialized dict means the TSV can't drift from `datasets_attrs.txt`. The hook sits at the one place every archive format passes through: tar, bag (dir and archive), rocrate (dir and zip), and file-source uploads all run `DirectoryModelExportStore._finalize` before they package the directory. So coverage across formats comes for free. Importers only read named attrs files, so old and new Galaxy both ignore the extra root file (checked `DirectoryImportModelStore1901`, `BagArchiveImportModelStore`). Copied HDAs sharing a `Dataset` get the same `exported_file` through the `dataset_id_to_path` early return. Duplicate names are fine because `exported_file` carries the encoded-id suffix.

## Findings (severity-ranked)

### 1. High (blocker, trivial): CI red, isort
The `Python linting` job fails on `format` (isort --check):
- `lib/galaxy/model/store/datasets_mapping.py:11-16`: `from collections.abc import Iterable` must come before `from typing import (...)`.
- `lib/galaxy/model/store/ro_crate_utils.py:23-25`: isort wants no blank line between `from galaxy.util.path import StrPath` and `from .datasets_mapping import ...`.
Fix: run `make format` or `isort` on the two files.

### 2. Medium: every internal `DirectoryModelExportStore` now writes the TSV, not just user exports
The write lives in the base class `_finalize` (`lib/galaxy/model/store/__init__.py:2645-2648`). So it also runs for:
- extended-metadata job staging: `lib/galaxy/metadata/__init__.py:234` (`metadata/outputs_new`), with `serialize_dataset_objects=True`
- `lib/galaxy/metadata/set_metadata.py:317` (`metadata/outputs_populated`, on the compute node / Pulsar)
- `lib/galaxy/model/store/build_objects.py:114`

With `serialize_dataset_objects=True`, file info is nested under `rval["dataset"]` and `serialize_files` never runs. `exported_file` is therefore always empty there. I confirmed this with a probe: an outputs_new-style store writes a TSV with `exported_file == ""`. The result is a useless extra file in every extended-metadata job directory, plus extra work and failure surface on a hot path. The bulkhead hides failures, but the file shouldn't be there at all.

Suggestion: make it opt-in on the store. Add a constructor kwarg (e.g. `write_datasets_mapping=False`), set it from `get_export_store_factory` and the legacy `DirectoryModelExportStore` in `lib/galaxy/managers/model_stores.py:96` (the tar'd-by-job history export). Alternatives: default it on and turn it off in the two metadata callers, or at minimum skip it when `serialization_options.serialize_dataset_objects` is set. This also removes the need for the `os.path.exists` check in `add_mapping_file_to_crate` for the empty-export case.

### 3. Medium: `datasets_mapping.tsv` isn't valid TSV when values contain `"`, tabs, or newlines
`write_datasets_mapping` (`datasets_mapping.py:87`) uses `csv.DictWriter(delimiter="\t")` with the default `QUOTE_MINIMAL`. That writes Excel-style CSV with tab separators, not TSV. The IANA `text/tab-separated-values` format has no quoting: a field may not contain a tab or newline, and `"` is an ordinary character. The RO-Crate entry declares exactly that format (`ro_crate_utils.py:34`).

In practice (checked on Python 3.14):
- `5" UTR` is written as `"5"" UTR"`. You don't need a tab or newline to hit this, just a quote. `cut`/`awk`, a Galaxy `tabular` upload, and pandas with `quoting=QUOTE_NONE` all read the quotes as part of the value.
- An annotation with a newline becomes a quoted record over two physical lines, which breaks any line-based reader.
- Only readers that apply Python's CSV quoting rules get the original values back.

Suggested fix:
1. In `mapping_row`, replace `[\t\r\n]+` with a single space in each value. No information is lost, since `datasets_attrs.txt` keeps the exact values.
2. Write with `quoting=csv.QUOTE_NONE, quotechar=None`. Values are written as-is (`5" UTR`). If a tab or newline ever gets past step 1, the writer raises `need to escape` instead of silently quoting.
3. Test with a name/annotation containing `"`, a tab, and a newline, and read it back strictly (`csv.reader(..., delimiter="\t", quoting=csv.QUOTE_NONE)`, or `line.split("\t")`). The current test uses a comma, which isn't special in TSV. It also reads back with a quote-aware `DictReader`, which silently undoes the quoting, so this bug can't show up in it.

### 4. Medium-low: collection membership misses element identifiers (the issue's sample-tracking case)
`collection_names_by_dataset_id` (`datasets_mapping.py:44-53`) records only the HDCA `name`. For a 50-sample list, every row gets the same `collection_name`, and HDA names are usually tool-derived (`FastQC on data 3: ...`). The sample identity lives in the `DatasetCollectionElement.element_identifier` (a path like `sample1/forward` for nested collections), which #22665 use case 3 asks for. Consider an `element_identifier` column built by walking `hdca.collection.elements` recursively. The walk would also let the HDCA branch drop the `hid is not None` restriction on HDCA membership, and it avoids keying only on `dataset.id`. Today `collection_names.get(dataset.id)` (`__init__.py:2508`) is keyed by id without checking the model class, so an LDDA with the same integer id as an HDA collection member would pick up the wrong name. That is unlikely (library + HDCA exports don't mix today), but an `isinstance(dataset, HistoryDatasetAssociation)` guard is cheap.
`collection_name` also has zero test coverage. `_setup_collection_invocation` (`test_model_store.py:1488`) and `_setup_simple_collection_job` (`:1441`) already exist to reuse.

### 5. Low: no user-facing description of the file
The RO-Crate README is generated by `_generate_markdown_readme` (`__init__.py:2671`) and currently says almost nothing. One sentence there pointing to `datasets_mapping.tsv` (and noting that `datasets_attrs.txt` is the authoritative source) would reuse existing machinery and set the "convenience, not a contract" expectation the issue asks for. Since it's labelled `highlight`, release notes will cover discoverability.

### 6. Nits
- `datasets_mapping.py:45`: `Iterable[model.DatasetCollection | model.HistoryDatasetCollectionAssociation,]` has a stray trailing comma inside the subscript. Accepting `Iterable[model.HistoryDatasetCollectionAssociation | model.DatasetCollection]` is fine.
- `DATASETS_MAPPING_ENCODING_FORMAT` as a module constant in `ro_crate_utils.py` for a single use is fine but could just be inline, like README's `"text/markdown"`.
- The module docstring is on the long side. The PR body already carries the rationale.

## Test assessment

- Good: the directory export test checks the header and that each `exported_file` exists on disk. There are also a tar inclusion test, crate registration tests (history dir, invocation dir, invocation zip), and a provenance-only row test.
- Accretion: the three crate tests are near-copies. Parametrize one test over `(export method, store class)`, or add the mapping assert to the existing `test_export_invocation_to_ro_crate_archive` / history crate tests next to `validate_*_crate_directory`.
- `test_mapping_row_projects_serialized_dict` restates the dict literal, and `test_mapping_row_tolerates_missing_keys` mostly checks `or ""`. Both are low value. Replace them with an escaping test (finding 3) and a collection test (finding 4).
- `test_history_export_survives_mapping_failure` monkeypatches to test a `try/except`. It's borderline trivial, but acceptable given the "never fail the export" promise.
- Missing: collection_name/element identifier coverage, special characters, and an assertion that extended-metadata stores don't write it (if finding 2 is adopted). An API-level integration assert isn't needed. The unit tests exercise the real store classes, which is the right level here.
- Tests weren't weakened. The existing attrs serialization refactor (the `to_json` removal for datasets only) keeps all existing tests green.

## Draft review body (unposted)

> **Posted by Claude (AI assistant) on behalf of jmchilton.**
>
> Nice. I like building the TSV from the same serialized dicts written to `datasets_attrs.txt`, and hooking it into `DirectoryModelExportStore._finalize` means tar/bag/rocrate/file-source exports all get it without per-format code. Importers ignore it, so there's no compat concern. A few things:
>
> 1. **CI**: the lint job fails on isort. `collections.abc` goes before `typing` in `datasets_mapping.py`, and there's a blank line before the relative import in `ro_crate_utils.py`. `make format` should fix both.
> 2. **Scope**: because the write is in the base `_finalize`, it also runs for the internal stores: extended metadata `outputs_new` (`lib/galaxy/metadata/__init__.py`), `set_metadata.py`'s `outputs_populated`, and `build_objects.py`. Those use `serialize_dataset_objects=True`, so `exported_file` is always empty and every such job directory gets a useless TSV. Could this be opt-in, e.g. a `write_datasets_mapping` kwarg set by `get_export_store_factory` and the legacy history export in `managers/model_stores.py`? Or at least skip it when `serialize_dataset_objects` is on.
> 3. **Quoting**: `csv` with a tab delimiter still uses `QUOTE_MINIMAL`. An annotation with a newline becomes a quoted multi-line record, and names containing `"` get quote-doubled. That breaks `cut`/spreadsheets and re-uploading as Galaxy `tabular`, which is the workflow the screenshot shows. Since `datasets_attrs.txt` stays authoritative, I'd collapse `[\t\r\n]` to spaces in `mapping_row` and write unquoted. Commas aren't special in TSV, so the comma test doesn't cover escaping. A tab/newline/quote case would.
> 4. **Collections**: #22665's sample-tracking case is really about element identifiers. `collection_name` is the same for every element of a list, and HDA names tend to be tool-derived. An `element_identifier` column (joined path for nested collections) would make this much more useful. Either way, `collection_name` is untested right now. `_setup_collection_invocation` / `_setup_simple_collection_job` could drive a test.
> 5. Tests: the three RO-Crate registration tests could be one parametrized test, or folded into the existing crate export tests. The two `mapping_row` dict tests mostly restate the implementation. I'd swap them for the escaping and collection tests above.
>
> Minor: a sentence in the RO-Crate README (`_generate_markdown_readme`) pointing at the mapping file would help discoverability. Also, `Iterable[... ,]` in `collection_names_by_dataset_id` has a stray trailing comma.

## Verdict

Comment / approve after changes. The approach and placement for format coverage are right. Fix isort (CI), restrict the write to user-facing exports, and sanitize TSV values. An element identifier column plus collection test is strongly suggested but not blocking.
