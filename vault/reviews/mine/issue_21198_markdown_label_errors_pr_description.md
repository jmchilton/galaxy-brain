## What

Fixes #21198. Viewing a `tool_markdown` dataset whose report references an
`output=` or `input=` label that the creating job doesn't have returned an
opaque 500 — the UI spun forever and the traceback ended at
`Exception("Unknown exception")`.

## Why it happened

`resolve_job_markdown` resolved labels against `job.io_dicts()` and had no
real error path for a miss:

- `output=` fell through to `raise Exception("Unknown exception")` — a bare
  `Exception`, so FastAPI renders it as a 500 rather than a client error.
- `input=` was an unguarded `io_dicts.inp_data[name]` subscript, so a bad
  input label escaped as an uncaught `KeyError` — also a 500.

Both date to `1f95f421c92` ("Tool markdown reports").

The most likely way to hit this is copying the document from
`markdown_report_simple_script.py` into another tool: it hardcodes
`output_text` / `output_image` / `output_table`, so unless the new tool
declares outputs by those names every directive misses. That is arguably the
tool author's mistake, but Galaxy's answer to it should not be "Unknown".

## How

Both branches now go through one `_resolve_job_reference` helper that raises
`MalformedContents` (400) naming the offending label and listing the valid
names for that direction.

This follows what already exists rather than inventing an error path:
`WorkflowInvocation.get_output_object` reports the same class of mistake on
the invocation side with a `MessageException` that names the label, and
`markdown_util` already uses `MalformedContents` for unknown directives and
malformed blocks. The job path was the one site that had neither.

## Testing

Unit, `test/unit/app/managers/test_markdown_export.py` — new
`TestResolveJobMarkdown` covering an unknown output label, an unknown input
label, and a known output label still resolving to `history_dataset_id=`.
Verified red first on the unresolvable cases, failing with the two production
bugs themselves (`Exception: Unknown exception` and `KeyError: 'no_such_input'`);
green after, 37 passed for the whole file.

API, `lib/galaxy_test/api/test_datasets.py` — two regression tests that upload
a `tool_markdown` dataset with a bad label and assert 400 plus the label in
`err_msg`. Verified red first at `Request status code (500) was not expected
value 400` for both, green after. This reproduces #21198 without a custom
tool, since the endpoint resolves against the *creating* job and an upload job
has none of these labels.

| Check | Result |
|---|---|
| `test_markdown_export.py` | 37 passed (red 2 failed first) |
| `test_datasets.py -k report_for_tool_markdown` | 2 passed (red 2 failed first) |
| `test/unit/app/managers/` | 439 passed |
| ruff 0.16.8 / black 26.1.0 / isort / flake8 7.3.0 / mypy / pre-commit | clean |

## Noticed, not fixed here

- `DatasetsService.report` does `open(file_path).read(1024 * 10)`, so reports
  over 10KB are silently truncated; a fence cut mid-block simply disappears
  because `GALAXY_FENCED_BLOCK` needs its closing fence. No error is raised.
- `WorkflowInvocation.get_input_object` still raises a bare `Exception`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
