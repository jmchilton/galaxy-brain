# galaxy#24411 — Job cache reuses a mapped-over job for a plain run, returning the wrong `element_identifier`

[Issue](https://github.com/galaxyproject/galaxy/issues/24411) · [proposal](proposal.md) · [debrief](debrief.md) · [source](issue_draft.md) · related [#24410](https://github.com/galaxyproject/galaxy/issues/24410)

Filed 2026-10-23. `JobSearch` never requires a plain request's cached job to lack `|__identifier__`. Reproduced on dev with the `identifier_single` tool.

Branch: [`issue_24411_job_cache_identifier_25.1`](../../../branches/active/issue_24411_job_cache_identifier_25.1/index.md) (base `release_25.1`). Also fixes the reverse direction the issue called guarded: mapped runs reused plain jobs or jobs mapped over another list, via the name-agnostic second search.
