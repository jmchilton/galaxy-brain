Composite and `extra_files` uploads move the user's source files out of their original location, deleting them.

When a dataset is fetched with a `file://` source that Galaxy resolves as a *link* (path paste / a `prefer_links` file source), `_has_src_to_path` returns `is_link=True`. The primary-dataset branch honours that and never copies the file into the job working directory, but the composite and `extra_files` branches discard `is_link` and `shutil.move` unconditionally — so the caller's own file is consumed.

`planemo test` on any workflow with a composite input therefore deletes that input from the user's checkout and reports success. In planemo's own suite, `tests/test_cmd_test.py::CmdTestTestCase::test_workflow_test_composite` passes while removing `tests/data/Example_Continuous.imzML` and `tests/data/Example_Continuous.ibd` from the working tree. A plain (non-composite) input uploaded by neighbouring tests in the same suite is untouched, which is the tell that this is specific to the composite path.

There is a second edge to it: for a non-binary composite part, `handle_composite_file` calls `convert_newlines` with the default `in_place=True` before the move, so the user's file is rewritten first. A failure between the two would leave the original mutated rather than merely missing.

## Fix

- `sniff.handle_composite_file` takes `purge_source` (default `True`, so the legacy `upload1` caller in `tools/data_source/upload.py` is unchanged). When it is false the line-ending conversion writes to a temp file instead of in place, and the source is copied rather than moved.
- `data_fetch.py` passes `purge_source=not is_link` from the composite loop, and copies instead of moving in the `extra_files` walk when the source is linked.

Composite parts are copied rather than genuinely linked because they have to land inside the dataset's extra-files directory, so the primary-dataset branch's "link and leave it alone" treatment is not available here.

## Tests

`test/integration/test_remote_files_posix.py` gains `TestPreferLinksPosixFileSourceIntegration::test_composite_upload_does_not_consume_linked_sources`. It fetches a velvet composite dataset through the fetch API with every part a `gxfiles://` URL on the class's `prefer_links` posix source, then checks the CRLF sources survive unmoved and unmodified while the staged `Roadmaps` part is converted. It fails without the fix (`the upload consumed the linked source .../root/sequences`) and passes with it.

The `extra_files` branch gets the same one-line fix but no test: the fetch API's `ExtraFiles` model only takes an archive-style `src`, so linked nested `extra_files` elements can't reach `data_fetch.py` through the API.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
