# galaxy #23857 - add XRootD file source

- PR: https://github.com/galaxyproject/galaxy/pull/23857 (PlushZ), base `dev`
- Reviewed head: `56dfc2b6fe80ebd282a6d611e1bbfd1a0031d7f7`, diffed vs merge-base `b437cb3f0d6` (origin/dev fetched 2026-10-06)
- Worktree: `~/projects/worktrees/galaxy/pr/23857`
- CI: two reds, both unrelated (unit: biotools network tests; API: `test_error_outputs_with_purged_inputs` workflow flake)

## Verdict

Request changes (small). Plugin is a close, tidy clone of `ipfs.py` and path-scoping logic works, but `skip_instance_cache=True` leaks a never-ending asyncio task per file operation, and there are no tests even though the IPFS sibling shows a cheap mock-based pattern. Remaining items are reuse/nits.

## Findings (by severity)

### 1. `skip_instance_cache=True` leaks a background task on every operation - `lib/galaxy/files/sources/xrootd.py:83`

`XRootDFileSystem.__init__` builds a `ReadonlyFileHandleCache`, whose ctor does `sync(loop, self._start_pruner)` -> `asyncio.create_task(self._pruner())`, a `while True: ... await asyncio.sleep(ttl)` loop on fsspec's shared IO loop. The task holds the cache, so it is never collected and the `weakref.finalize` never fires. Galaxy calls `_open_fs` once per list/realize/write, so with instance caching disabled each call leaves a permanent task behind in the web/job handler process.

Verified with fsspec-xrootd 0.5.5 in a scratch venv: 50 constructions -> 50 live `_pruner` tasks with `skip_instance_cache=True`, 1 without.

Side effects: a fresh instance per call also means `use_listings_cache` / `listings_expiry_time` (from `FsspecCommonCacheOptions`) never do anything, and the `fs.invalidate_cache(...)` at :115 invalidates a cache nobody will read.

Fix: drop `skip_instance_cache=True` (no other plain fsspec sibling sets it; `gitlab.py` does, with a comment explaining its aiohttp-session reason, which doesn't apply here). fsspec then keys the instance on `hostid`/`timeout`/cache options.

### 2. No tests; the sibling pattern is cheap - new `test/unit/files/test_xrootd.py`

`test/unit/files/test_ipfs.py` tests the same root-scoping code with `MagicMock` filesystems and `patch.object(..., "required_module", MagicMock())`, so `fsspec-xrootd` isn't needed in CI. I wrote a throwaway version against this head (since deleted). All 6 passed:
- listing at `root=" /Folder/ "` and `root="/"` (fsspec-xrootd returns `"//a/b.txt"` for root `/`, which `_adapt_entry_path` normalizes correctly);
- `..` in write targets rejected before `fs.open`;
- `write_from` calls `fs.open("/Folder/a/b.txt", "wb")` and never `put_file`;
- a listing entry `/Folder2/x` under root `/Folder` rejected.

`test_template_models.py::test_examples_parse` already covers the new example YAML (passes).

A live-server test doesn't fit Galaxy CI: the `xrootd` wheel is client-only, and the server comes from conda/apt. Mock-level tests at the IPFS bar are the realistic ask.

### 3. Path-scoping helpers duplicated from `ipfs.py` - `xrootd.py:26-38, 88-100`

`_normalize_relative_path` is a verbatim copy of `ipfs.py:33-38` with the word "IPFS" swapped. `_to_filesystem_path` / `_adapt_entry_path` have the same shape as the IPFS ones, and `ssh.py:101-119` has a weaker variant with no `..` check. This is the third "fsspec source scoped under a configured root" plugin, so it's time to pull the logic into `_fsspec.py`: either module-level helpers taking `(root, label)` or a small rooted-source mixin overriding both hooks. The minimum is to share `_normalize_relative_path` between ipfs and xrootd. This could also be a follow-up.

### 4. Custom `_write_from` stays a one-off, not a base-class abstraction - `xrootd.py:102-115`

The root cause is that `fsspec.asyn.AsyncFileSystem._put_file` raises `NotImplementedError` and fsspec-xrootd doesn't override it. The sync `AbstractFileSystem.put_file` is already this open-"wb"-and-stream loop, plus a parent `mkdirs`. XRootD is the only writable consumer, so hoisting a fallback into `FsspecFilesSource._write_from` (catching `NotImplementedError` around `put_file`) isn't worth it yet. The more durable fix is an upstream `_put_file` in fsspec-xrootd. Meanwhile, the local override is fine, with two changes:
- drop `fs.invalidate_cache(...)` at :115, since `XRootDFile.close()` already invalidates the path and its parent;
- no parent-dir creation, unlike base `put_file` or Dropbox's `_ensure_directory`. The template help scopes writes to "existing directories", which is acceptable, but a code comment or test should make that explicit.

### 5. Nits
- `production_xrootd.yml:16-20`: `writable` lacks `default: false`, which `production_webdav.yml` / `production_s3fs.yml` set.
- `hostid` help says "without root:// or a path", but nothing enforces it. A light validator would turn a confusing `ValueError("Invalid hostid")` from the library into a clear form error.

### Checked, fine
- Imports all at module top. The `try/except ImportError` optional-import pattern matches siblings.
- Dependency: `fsspec-xrootd>=0.5.5 # type: xrootd` in `conditional-requirements.txt` plus `check_fsspec_xrootd` follows the ipfs/iiif convention, and the name matches `check()`'s `-`->`_` normalization. The `xrootd` binary wheels exist only for manylinux_2_28 and macOS 15, which is fine for an opt-in dep.
- Template models (`templates/models.py`), the `FileSourceTemplateType` literal, `TypesToConfigurationClasses`, `schema.ts` and `fileSources.ts` were all updated consistently. Plugin `timeout` defaults to 30 (library default 0 = never).

## Risks

The one-way part is small: a new `xrootd` template/plugin type whose config field names (`hostid`, `root`, `timeout`, `writable`) get persisted in user-defined file source instances and exposed in the API schema.

<details><summary>Risk Details</summary>

- Renaming or reshaping `hostid`/`root` later needs a template version bump and migration of saved user instances.
- `"xrootd"` joins the `FileSourceTemplateType` API enum, and clients may start relying on it.
- As written, every XRootD operation leaks a long-lived asyncio task in the Galaxy process (finding 1). This is reversible but would hurt a long-running server that has the template enabled.
- Opt-in only: nothing changes unless an admin installs the conditional dep and enables the template.

</details>

<details><summary>Risk Review Advice</summary>

Check that the template's variable names and the anonymous-only access model are what we want to commit to for XRootD, since adding token or X509 auth later will want `secrets` and maybe new fields. Everything else is plugin-internal and cheap to change after merge.

</details>

## Draft GitHub review (unposted)

---

*Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*

Thanks, this is a clean addition, and mirroring the IPFS plugin's root scoping makes it easy to follow. A few things before merge:

**1. `skip_instance_cache=True` leaks a task per operation (`xrootd.py:83`).** `XRootDFileSystem.__init__` creates a `ReadonlyFileHandleCache`, which starts a `while True` `_pruner` task on fsspec's shared event loop, and that task is never cancelled. Galaxy opens a filesystem for every list/download/upload, so with instance caching disabled each call leaves a permanent task behind. In a quick check with fsspec-xrootd 0.5.5, 50 constructions left 50 live pruner tasks with the flag set and 1 without. Dropping the flag fixes it and also makes the configured listings cache effective again.

**2. Tests.** `test/unit/files/test_ipfs.py` covers the same root-scoping logic with mocked filesystems (patching `required_module`, so CI doesn't need `fsspec-xrootd`). A `test_xrootd.py` along those lines should cover:
- listing under `/Folder` and under `/` (the library returns `//name` there);
- `..` rejection on read and write;
- a sibling-prefix entry like `/Folder2/x` being rejected;
- `write_from` going through `fs.open(..., "wb")`.

**3. Shared path helpers.** `_normalize_relative_path` is a verbatim copy of the one in `ipfs.py`, and `_to_filesystem_path` / `_adapt_entry_path` follow the same shape. Could the helper move into `_fsspec.py` (or a small shared module) and be used by both plugins? A follow-up is fine if you'd rather keep this PR small.

**4. `_write_from`.** Keeping the override local makes sense, since this is the only writable fsspec backend without `_put_file`. Implementing `_put_file` in fsspec-xrootd upstream would let it go away eventually. The `fs.invalidate_cache(...)` at the end can be dropped, because `XRootDFile.close()` already invalidates the file and its parent directory.

Minor: `writable` in `production_xrootd.yml` could use `default: false` like the WebDAV and S3 templates.

The current CI failures (biotools unit tests, a workflow API test) look unrelated.

## Cleanup branch (2026-10-06)

`jmchilton:xrootd_review_fixes` (head `7ba4985b39c`), 4 commits on top of the PR head `56dfc2b6fe8`, for John to inspect before deciding whether to push to the author's branch:
- drop `skip_instance_cache=True` + redundant `invalidate_cache` (finding 1/4), comment that parents aren't created;
- `normalize_rooted_relative_path(path, label)` in `_fsspec.py`, used by ipfs + xrootd (finding 3, minimum version; `_to_filesystem_path`/`_adapt_entry_path` not unified — root forms differ);
- `writable` `default: false` in template;
- `test/unit/files/test_xrootd.py`: 11 mock tests; red-checked (breaking the `..` guard fails 5).

Pushed to the author branch `PlushZ:add-xrootd-fs` on 2026-10-06 without the unit-test commit, at John's request: head `f100983e424`. `7ba4985b39c` (the tests) remains only on `jmchilton:xrootd_review_fixes`. The draft review still asks for the fixes now pushed, so it needs rewriting before posting.
