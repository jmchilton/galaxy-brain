# galaxy#24411 — Job cache reuses a mapped-over job for a plain run, returning the wrong `element_identifier`

[Issue](https://github.com/galaxyproject/galaxy/issues/24411) · [proposal](proposal.md) · [debrief](debrief.md) · [source](issue_draft.md) · related [#24410](https://github.com/galaxyproject/galaxy/issues/24410)

Filed 2026-10-23. `JobSearch` never requires a plain request's cached job to lack `|__identifier__`. Reproduced on dev with the `identifier_single` tool.

Next: add a `NOT EXISTS` guard in `_build_stmt_for_hda`, plus a red API test in `test_jobs.py`. This may land on `udt_element_identifier_api_test` (scope decision pending).
