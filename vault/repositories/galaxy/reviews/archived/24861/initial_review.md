# Initial review — #24861

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `15b1e13ac15c5624cab3593a5eecf73850a8f54a`
- Base: `release_26.1`

## Verdict

Small, correct bug fix. The core change is sound: when `decompress` is set, `verify()` now hashes the decompressed bytes, and the old inline temp-file decompress in `verify_assertions` moved into a reusable `galaxy.util.compression_utils.decompress_bytes` helper that both paths use. Semantics match the `compare` path (`get_compressed_formats` → `compressed_formats=None`, so zip covers the first member everywhere). Docs in `galaxy.xsd` and `tool_util_models` are updated and the client and editor schemas are regenerated to match. The behavior change for checksum-of-compressed-bytes + `decompress` is called out in the PR body. No P1 issues. Two minor items follow.

## Findings

### P3 1 — The clearer decompression error only covers checksums; assertions with the same flag still raise a raw, unlabeled exception

`verify()` now wraps `decompress_bytes` for the checksum in `try/except Exception` and re-raises it as an `AssertionError` that names `item_label`. The sibling path one block above (`verify_assertions(..., decompress)`) calls the same `decompress_bytes` with no wrapping, and `verify()` only catches `AssertionError` there. Assertions run before the checksum, so a corrupt or truncated gzip output on a test that has both `assert_contents` and `checksum` still fails with a bare `EOFError` / `BadGzipFile` and no output name. Only tests with a checksum alone get the new message. With both present, the output is also written to a temp file and decompressed twice.

Fix: in `verify()`, decompress once up front when `decompress` is set, inside the single labeled `try/except`. Then pass the decompressed bytes to `verify_assertions` (with `decompress=False`) and to `_verify_checksum`. That gives every content check the same labeled error and one decompression. `verify_assertions` keeps its `decompress` parameter for its other callers (`test_asserts.py`). Optional; the current code is correct for the reported bug.

### P3 2 — New tests import `gzip`/`hashlib` inside each function

`test_checksum_honors_decompress`, `test_checksum_with_decompress_on_uncompressed_output`, `test_md5_honors_decompress`, `test_checksum_mismatch_says_it_is_over_decompressed_content` and `test_corrupt_compressed_output_is_an_assertion_error` each do `import gzip` / `import hashlib` in the body. These are stdlib modules with no reason to defer, and the sibling `test/unit/tool_util/verify/test_asserts.py` imports `gzip` at the top. Move them to the module's top-level imports next to the newly added `import pytest`.

## Notes (not findings)

- Test coverage is good and well targeted: the parametrized 4-case truth table covers both directions of the behavior change, plus the `md5=` legacy attribute, uncompressed output with `decompress`, the mismatch message, and corrupt input. These tests go through `verify()` rather than unit-testing the helper alone, which suits this change. The PR body's test command lists `test/unit/util/test_compression_util.py`, but the PR adds nothing there. That's fine, since `decompress_bytes` is covered through `verify()`.
- `except Exception` around `decompress_bytes` would also relabel unrelated failures, such as temp-file I/O errors, as "could not be decompressed". That's harmless in practice.
- `interactor._verify_checksum` (test-data download checksums) is a different concern (input integrity) and correctly isn't affected.
- PR base is `release_26.1` but its milestone is 27.0. The coordinator may want to check that this is intended for a release-branch bug fix.
