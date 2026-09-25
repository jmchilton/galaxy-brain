# PR #23693 — Do not convert binary deferred datasets

Reviewed head: `085cf26c913b50a90f813f4ac50c4617f9452529`

Target: `release_26.1`

## Decision

Ready to merge. I found no blocking correctness, security, compatibility, or data-corruption issue.

## Findings

No findings.

## Review notes

- The corruption fix is in the right layer. `DatasetInstanceMaterializer._stream_source` constructs a `FilePrefix` for the downloaded bytes and calls the shared `should_convert_text` guard before either newline or space conversion (`lib/galaxy/model/deferred.py:287-300`). Binary content and any recognized compressed content therefore keep their exact bytes.
- Upload and deferred materialization now share the same policy: text conversion is allowed only for an uncompressed, non-binary `FilePrefix` (`lib/galaxy/datatypes/sniff.py:916-918`, `lib/galaxy/datatypes/sniff.py:961`). This preserves the upload path's prior behavior rather than introducing a second detection rule.
- The compressed case is handled conservatively and consistently with the materializer's existing contract. Deferred sources are not decompressed in this path, so treating any recognized compression format as non-convertible avoids rewriting an encoded byte stream.
- Hash handling remains sound: source hashes are checked before transformations and dataset hashes after transformations (`lib/galaxy/model/deferred.py:267-270`, `lib/galaxy/model/deferred.py:314-316`). Skipping an inapplicable requested transform does not invalidate or silently replace hashes.
- `DatasetSource.transform=[]` is a useful and backward-compatible distinction from `None`: the former records that processing completed without modifying bytes, while the latter continues to represent an unprocessed deferred source or a legacy row (`lib/galaxy/model/__init__.py:5281-5285`). The existing nullable JSON column needs no migration. Normal upload discovery uses `.get("transform")`, which preserves an explicit empty list, and existing legacy/deferred import logic still handles missing/`None` values.
- Upload/materialization recording is consistent. Uploads now always emit the list of transformations actually applied, including `[]` (`lib/galaxy/tools/data_fetch.py:426-435`), matching materialization's existing applied-transform list.
- The new regression tests exercise the dangerous byte patterns, not merely the decision helper: materialization verifies exact byte preservation for HDF5-like binary bytes and gzip bytes containing CR, and verifies `transform == []` (`test/unit/data/test_dataset_materialization.py:417-458`). Upload tests verify CRLF text remains convertible, binary bytes remain unchanged, and the serialized applied-transform state distinguishes a real conversion from no conversion (`test/unit/data/datatypes/test_sniff.py:164-183`, `test/unit/app/tools/test_data_fetch.py:114-146`). Existing materialization tests continue to cover successful text transforms and legacy requested-transform import.

## Tests

Focused local run:

```text
pytest -q test/unit/data/test_dataset_materialization.py \
  test/unit/data/datatypes/test_sniff.py \
  test/unit/app/tools/test_data_fetch.py

97 passed
```

The run emitted pre-existing resource-cleanup warnings about closed temporary file descriptors, but no failures. GitHub CI at the reviewed head had all substantive checks green; CWL conformance was skipped.

## Residual risk

Binary classification still depends on the established `FilePrefix`/libmagic-and-prefix heuristic, so an unusual binary format with a long text-like prefix could theoretically be classified as text. This PR does not worsen that behavior, applies exactly the same classification as regular uploads, and explicitly protects all recognized compressed streams. The concrete HDF5 failure and compressed-content case are directly covered.

## Merge recommendation

Merge as-is into `release_26.1`.
