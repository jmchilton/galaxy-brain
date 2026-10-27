### P2 1: `CompressedFile` still picks zip on bare `is_zipfile` and crashes on the PR's own fixture (implementation verified)

`CompressedFile.__init__` checks `zipfile.is_zipfile` before `tarfile.is_tarfile`. On `test-data/tar_with_stray_zip_end_record.tar` it picks `zip` and raises `BadZipFile: Bad magic number for central directory`, even though `is_tarfile` is True. The #24488 tar can now be uploaded as a dataset, but it still fails as an `elements_from: archive` source (`tools/data_fetch.py` `_decompress_target`). Other callers include `model/store`, `tools/imp_exp/unpack_tar_gz_archive.py` and `datatypes/isa.py`.

<details><summary>Evidence</summary>

Probe at PR head:

```
== tar_with_stray_zip_end_record.tar is_zipfile True is_tarfile True
 get_fileobj_raw None b'member.bin\x00...'
 FilePrefix None application/x-tar
 CompressedFile EXC BadZipFile Bad magic number for central directory
```

</details>

If opening the zip raises `BadZipFile` and `tarfile.is_tarfile` is True, open the file as tar instead. Zip stays first in the order. Moving tar ahead would change behavior for real zips, because `is_tarfile` is lenient.

<details><summary>Details</summary>

```python
try:
    self.archive = getattr(self, method)(file_path, mode)
except zipfile.BadZipFile:
    # is_zipfile also matches a tar that merely contains a zip end record.
    if not tarfile.is_tarfile(file_path):
        raise
    self.file_type = self.type = "tar"
    self.archive = self.open_tar(file_path, mode)
```

Commit `1ca64d6b600` on `pr_24495_review_0`, with unit test `test_compressed_file_tar_with_stray_zip_end_record`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort: the new unit test fails at the PR head and passes with the fix, and the probe now reports `CompressedFile tar`.

</details>

### P2 2: The new helper crashes on empty zips and sniffs directory entries; reuse `checkers.iter_zip` (implementation verified)

`_open_first_zip_member` opens `zh.namelist()[0]` and catches only `BadZipFile`, which causes two problems:

- **Empty zip.** For an empty zip, or a tar whose last member is an empty zip, `ZipFile()` succeeds and `namelist()[0]` raises `IndexError`. `FilePrefix` then fails on every upload route. That is the same failure class as #24488.
- **Directory entry first.** When the first entry is a directory (`d/` before `d/a.txt`), `FilePrefix` sniffs empty content. Decompression (`sniff.zip_single_fileobj`) uses `a.txt`, so sniffing and decompression see different members.

`checkers.iter_zip` already implements "first non-directory member", and `compression_utils` already imports from `checkers`.

<details><summary>Evidence</summary>

```
== empty.tar is_zipfile True is_tarfile True
 get_fileobj_raw EXC IndexError list index out of range
 FilePrefix EXC IndexError list index out of range
```

</details>

Take the first member from `iter_zip`, and return `None` on `BadZipFile` or `StopIteration` so the file is read raw.

<details><summary>Details</summary>

```python
members = iter_zip(filename)
try:
    return next(members)[0]
except (zipfile.BadZipFile, StopIteration):
    return None
finally:
    members.close()
```

`iter_zip` gets a return annotation, `Generator[tuple[IO[bytes], str], None, None]`, so mypy stays clean. The `mode` argument is dropped. Write mode on a zip never worked: `ZipFile(path, "w")` truncates the file, then `namelist()[0]` raised. No caller passes it.

Commit `cb8fca124e1`, with unit tests `test_get_fileobj_raw_empty_zip_read_raw` and `test_get_fileobj_raw_zip_skips_directory_entries`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort:

- Both new tests fail at the PR head and pass with the fix.
- The probe reads `empty.tar` as `application/x-tar`.
- A `-X dev` `ResourceWarning`-as-error probe was clean.
- Crafted EOCD variants (huge CD size or offset, disk mismatch) raise nothing except `BadZipFile`.
- Directory-first zips holding `1.bed` or `1.fastqsanger` upload with the same ext before and after (`bed`/`fastqsanger` with `auto_decompress`, `binary` without). Raw `guess_ext` on the directory-first bed zip changes from `txt` to `tabular`, which now matches the flat zip.

</details>

### P2 3: No API test for the upload regression the PR fixes (implementation verified)

The issue is that uploads of such a tar failed on every route. The PR's tests stop at `get_fileobj_raw` and `FilePrefix`, so nothing covers the user-visible fetch upload.

Add a fetch-API test to `lib/galaxy_test/api/test_tools_upload.py` that uploads the committed fixture. It asserts state ok, `file_ext == "tar"`, and an unchanged size.

<details><summary>Details</summary>

`test_upload_tar_with_stray_zip_end_record` in `TestToolsUpload`, commit `8355212f702`.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort: the test fails with `release_26.2`'s `compression_utils.py` (dataset ends in `error`) and passes on the review branch.

</details>

### P3 1: A tar ending in a valid zip is still silently misclassified; the zip test has no leading-magic check

If a tar's last member is a real zip, `ZipFile()` succeeds by treating the tar as prepended data. `get_fileobj_raw` reports `zip` and returns the inner zip's first member. With `auto_decompress`, the upload replaces the dataset with that inner file and sniffs it as `txt`, so data is lost silently. `CompressedFile` likewise extracts only the inner zip.

This predates the PR but has the same root cause. Of the format checks in this chain, only zip doesn't check leading magic bytes: gzip, bz2 and xz all do. Other bare `is_zipfile` users have the same blind spot: `checkers.check_zip`/`is_zip` (used by `tool_shed/util/tool_util.py` and `tool_util/loader_directory.py`) and `tool_util/verify/interactor.py`.

<details><summary>Evidence</summary>

```
== realzip.tar is_zipfile True is_tarfile True
 get_fileobj_raw zip b'inner content\n'
 FilePrefix zip text/plain
# handle_uploaded_dataset_file_internal(auto_decompress=True) -> ext=txt, content b'inner content\n'
```

</details>

A stricter shared check on `dev` would fix this case. It would require a leading `PK\x03\x04`/`PK\x05\x06`, or a first member with `header_offset == 0`, and be used by `get_fileobj_raw`, `CompressedFile` and `check_zip`. That would reject self-extracting and prepended-data zips, so it suits a `dev` follow-up rather than this release-branch fix.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>
