Composite and `extra_files` uploads move the user's source files out of their original location, deleting them.

When a dataset is fetched with a `file://` source that Galaxy resolves as a *link* (path paste / a `prefer_links` file source), `_has_src_to_path` returns `is_link=True`. The primary-dataset branch honours that and never copies the file into the job working directory, but the composite and `extra_files` branches discard `is_link` and `shutil.move` unconditionally — so the caller's own file is consumed.

`planemo test` on any workflow with a composite input therefore deletes that input from the user's checkout and reports success. In planemo's own suite, `tests/test_cmd_test.py::CmdTestTestCase::test_workflow_test_composite` passes while removing `tests/data/Example_Continuous.imzML` and `tests/data/Example_Continuous.ibd` from the working tree. A plain (non-composite) input uploaded by neighbouring tests in the same suite is untouched, which is the tell that this is specific to the composite path.

There is a second edge to it: for a non-binary composite part, `handle_composite_file` calls `convert_newlines` with the default `in_place=True` before the move, so the user's file is rewritten first. A failure between the two would leave the original mutated rather than merely missing.

## Fix

- `sniff.handle_composite_file` takes `purge_source` (default `True`, so the legacy `upload1` caller in `tools/data_source/upload.py` is unchanged). When it is false the line-ending conversion writes to a temp file instead of in place, and the source is copied rather than moved.
- `data_fetch.py` passes `purge_source=not is_link` from the composite loop, and copies instead of moving in the `extra_files` walk when the source is linked.

Composite parts are copied rather than genuinely linked because they have to land inside the dataset's extra-files directory, so the primary-dataset branch's "link and leave it alone" treatment is not available here.

## Tests

`test/unit/app/tools/test_data_fetch.py` gains two tests that serve `file://` URLs through a `prefer_links` posix file source — the shape path paste produces:

- `test_extra_files_do_not_consume_a_linked_source`
- `test_composite_files_do_not_consume_a_linked_source` — also asserts the source is not rewritten in place, by feeding it CRLF content and checking the CRLFs survive on disk while the staged copy is converted.

Both fail on the current branch (`the upload consumed the linked source file`) and pass with the fix. `_execute_context` grows an optional `file_sources` argument so a test can register the posix source.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
