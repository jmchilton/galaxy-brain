# Composite and extra_files uploads move (destroy) the user's source files

_Drafted by an AI assistant (Claude) on jmchilton's behalf — not personally authored._

## Summary

When a dataset is uploaded through the fetch API with a `file://` source that Galaxy resolves
as a *link* (path paste / `prefer_links` file source), the **composite parts and `extra_files`
elements are moved out of their original location**, deleting the user's files. The primary
dataset file is safe in the same request — only the composite/extra-files paths are affected.

The asymmetry is unintended: `_has_src_to_path` returns `is_link=True` for these sources, and
the primary-dataset branch honours it, but the composite and `extra_files` branches discard it
and move unconditionally.

## Impact

`planemo test` on any workflow with a composite input deletes that input from the user's
checkout, and reports success. In planemo's own suite,
`tests/test_cmd_test.py::CmdTestTestCase::test_workflow_test_composite` passes while removing
`tests/data/Example_Continuous.imzML` and `tests/data/Example_Continuous.ibd` from the working
tree. Nothing warns; the test data is simply gone afterwards.

Anyone running a local/managed Galaxy through a client that uses path paste (planemo, CI
harnesses, staging scripts) loses the source files on every composite upload.

## Reproduction

Against galaxy `fea251f0676` (dev, 2026-09-22), planemo `master` + the planemo venv:

```sh
cd <planemo checkout>
md5 tests/data/Example_Continuous.imzML tests/data/Example_Continuous.ibd   # present
pytest tests/test_cmd_test.py -k test_workflow_test_composite -q
# 1 passed
git status --porcelain tests/data
#  D tests/data/Example_Continuous.ibd
#  D tests/data/Example_Continuous.imzML
```

`tests/data/hello.txt`, uploaded as a plain (non-composite) input by neighbouring tests in the
same suite, is untouched — which is the tell that this is specific to the composite path.

Run twice, on two different planemo revisions, with the same result; not specific to any
planemo change.

## Root cause

Line numbers against `origin/dev` @ `280eefdce53`.

**1. `lib/galaxy/datatypes/sniff.py:98` `handle_composite_file`**

```python
    if not is_binary:
        if upload_opts.get("space_to_tab"):
            convert_newlines_sep2tabs(src_path, tmp_dir=tmp_dir, tmp_prefix=tmp_prefix)
        else:
            convert_newlines(src_path, tmp_dir=tmp_dir, tmp_prefix=tmp_prefix)   # :112, in place

    shutil.move(src_path, file_output_path)                                       # :114
```

`src_path` is whatever the caller resolved. There is no check that it lives inside the job
working directory, so an external source is moved away. For a non-binary part
(`Example_Continuous.imzML` is XML) `convert_newlines` also rewrites the user's file in place
first — `in_place` defaults to `True` and the caller does not override it — so a failure
between the two lines would leave the original mutated rather than merely missing.

**2. `lib/galaxy/tools/data_fetch.py:246-248`, the composite loop**

```python
_, src_target, _ = _has_src_to_path(upload_config, composite_item)
sniff.handle_composite_file(datatype, src_target, extra_files_path, key, ...)
```

The third element of the tuple is `is_link`, discarded here.

**3. `lib/galaxy/tools/data_fetch.py:516-531`, the `extra_files` walk**

```python
src_name, src_path, _ = _has_src_to_path(upload_config, item)
...
shutil.move(src_path, file_output_path)
```

Same shape, same discarded `is_link`, same unconditional move.

**Why the primary dataset escapes — `lib/galaxy/tools/data_fetch.py:386-393`**

```python
name, path, is_link = _has_src_to_path(
    upload_config, item, is_dataset=True, link_data_only_explicitly_set=link_data_only_explicit
)
if is_link:
    link_data_only = True
    default_in_place = True
```

`link_data_only` then skips `ensure_in_working_directory` (`:484-486`), which is the only place
that consults `purge_source` and chooses `shutil.move` vs `shutil.copy`
(`UploadConfig.ensure_in_working_directory`, `:811-829`).

**Where `is_link` comes from — `lib/galaxy/tools/data_fetch.py:676-691`**

```python
if src == "url":
    ...
    file_source, rel_path = file_sources.get_file_source_path(url)
    prefer_links = file_source.prefer_links()
    if prefer_links:
        path = os.path.abspath(os.path.join(file_source.root, rel_path))
        ...
        is_link = True
        return name, path, is_link
```

So for a `file://` URL through a `prefer_links` file source, `path` *is* the caller's own file.

## How a client reaches this

`galaxy/tool_util/client/staging.py`, `StagingInterface.stage` → `upload_func_fetch._attach_file`:

```python
if not is_path or use_path_paste:
    return {"src": "url", "url": uri}      # uri == "file:///abs/path"
```

Composite items go through the same `_attach_file`, so each part arrives as a `file://` URL.
planemo sets `use_path_paste` from `config.use_path_paste`, which is on by default for a
managed/local Galaxy.

## Suggested direction

Make the composite and `extra_files` paths respect `is_link` / `purge_source` the way the
primary dataset already does — copy instead of move when the source is not inside the job
working directory, and don't convert line endings in place on a source Galaxy doesn't own.
`UploadConfig.ensure_in_working_directory` (`data_fetch.py:811`) already encodes exactly this
decision and uses `in_directory(path, self.__workdir)` as the test, so the logic exists and
just isn't reached from these two call sites.

Worth deciding deliberately whether a linked composite source should be copied or genuinely
linked; the primary-dataset branch links it, which for composite parts may not be viable since
they are written into the dataset's extra-files directory.

## Not verified

- Whether the legacy `upload1` path (`galaxy/tools/parameters/grouping.py`) has the same
  problem; only the fetch path was exercised.
- Behaviour with a non-`prefer_links` file source, or with `link_data_only` set explicitly.
- Whether any existing Galaxy test asserts that composite sources survive an upload — a fix
  should add one.
