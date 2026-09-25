# PR 23595 — Add IPFS file source

Reviewed: 2026-09-22  
Head: `2168c9a3a74b7c0f82cf120d2000d8102f414aec`  
Base: `dev` (merge base `101e060a65c98680929876085724c0f615a3e57f`)  
Verdict: changes requested; the correctness/root-isolation bug is fixed, while broader behavioral coverage remains to be addressed.

## Summary

This is a compact integration with Galaxy's existing `FsspecFilesSource` seam. The dependency is conditional on a configured `ipfs` source, the generated template/API model changes are internally consistent, `writable: Literal[False]` makes the source unambiguously read-only, and the implementation streams imports through `ipfsspec`'s `get_file` rather than buffering the complete object in Galaxy.

The declared `ipfsspec>=0.6.0` API is used correctly: version 0.6.0 accepts `gateway_addr` and synchronous wrappers via `asynchronous=False`. The configured gateway was also verified directly against that exact package.

## Findings

### 1. Resolved — resolve every user-visible path underneath the configured root

File: `lib/galaxy/files/sources/ipfs.py:56-59`

`root` is described as the CID of the directory exposed by this file-source instance, but `_to_filesystem_path()` only applies it when `path` is exactly `/`. Any non-root path is sent directly to the gateway:

```python
_to_filesystem_path("/", config)                    # "bafy-root"
_to_filesystem_path("/nested/hello.txt", config)    # "nested/hello.txt"
```

That violates the file-source contract that paths are relative to the configured source root. A direct list/import of `gxfiles://<id>/nested/hello.txt` therefore asks IPFS for the unrelated top-level name `nested/hello.txt`, not `bafy-root/nested/hello.txt`. It also lets a caller supply another known CID and escape the directory the administrator/user configured.

Browsing happens to mask this because `ipfsspec` returns names prefixed by the CID, and the current implementation exposes those full backend paths back to the client. The implementation should instead mirror rooted fsspec sources such as GCS: always prefix relative paths with the normalized configured CID, and override `_adapt_entry_path()` to remove that prefix from entries returned to Galaxy. Please cover root listing, nested listing, and direct realization of a relative URI.

Suggested review comment:

> `root` currently affects only the initial `/` listing. Every subsequent/direct path bypasses it, so `/nested/hello.txt` is resolved as `nested/hello.txt` instead of `<configured CID>/nested/hello.txt`; a caller can also substitute another CID. File-source paths are meant to be relative to the configured root. Could we always prefix `config.root` in `_to_filesystem_path()` and strip that backend prefix in `_adapt_entry_path()` (as the rooted GCS source does), with nested list/import tests?

Fixed directly on the PR branch in `2168c9a3a74`: all Galaxy paths are now resolved under the normalized configured CID, backend CID prefixes are removed from returned entries, and focused tests cover root/nested listings plus direct realization.

### 2. Blocking — add behavioral tests for the new backend

Files: `lib/galaxy/files/sources/ipfs.py` and a new `test/unit/files/test_ipfs.py`

The fix for finding 1 adds focused coverage for root/nested path conversion, returned Galaxy paths/URIs, and the rooted path passed to `get_file`. Broader backend coverage is still missing for gateway construction and read-only enforcement. The existing generic `test_examples_parse` proves only that `production_ipfs.yml` conforms to the template model.

A focused unit test can mock `AsyncIPFSFileSystem`—no live IPFS daemon is required—and assert:

- the normalized `gateway_url` is passed as `gateway_addr`;
- writes remain rejected.

One opt-in/live integration test against Kubo would be useful, but it is not necessary to obtain meaningful deterministic regression coverage.

Suggested review comment:

> The root/nested list and import path behavior now has focused regression coverage. Could we complete the backend tests by mocking `AsyncIPFSFileSystem` to verify gateway construction and read-only behavior without running Kubo?

## Validation

- `test/unit/files/test_template_models.py`: **17 passed** on Python 3.13. This includes parsing every file-source template example, including `production_ipfs.yml`.
- `test/unit/files/test_ipfs.py`: **2 passed**, covering rooted root/nested listings, relative returned paths/URIs, and rooted direct realization.
- Exact optional dependency check: installed `ipfsspec==0.6.0` in the disposable worktree environment and verified `_open_fs()` constructs `AsyncIPFSFileSystem` with `gateway_addr=https://gateway.example`.
- The original-head direct path probe confirmed that `/nested/hello.txt` mapped to `nested/hello.txt`, omitting the configured `bafy-root` CID; the pushed fix now maps it to `bafy-root/nested/hello.txt`.
- `git diff --check`: clean.
- GitHub CI is broadly green, including both OpenAPI validation jobs, client tests, analysis, startup, and backend suites. One Selenium shard currently fails in two published-history tests unrelated to this IPFS-only diff; other shards pass and some checks remain pending.

## Non-findings / notes

- No existing GitHub comments or reviews needed deduplication at the reviewed head.
- `ipfsspec>=0.6.0` is correctly wired into conditional dependency detection for both static file-source configuration and configured user-file-source template catalogs.
- `Literal[False]` plus the base class's `_ensure_writeable()` correctly prevents export before `_write_from()` is reached; the explicit `_write_from()` error is still a useful defensive message.
- The gateway is supplied through an administrator-enabled file-source template. As with Galaxy's other configurable remote file sources, deployments should decide whether users may choose arbitrary endpoints; I did not treat that general policy question as a PR-specific blocker.
