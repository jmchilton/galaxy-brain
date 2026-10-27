Profile gx_risk_assessment, Opus 5.5, low effort, reviewed commit 30b808629416e02e14a12efa3d3493b49c23ffb1.

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix in `RemoteFilesUpload.vue` (watchers on `searchQuery`/`currentPage` replaced by explicit `updateSearchQuery`/`onPageChange` handlers) plus a new vitest file; no API, workflow, or tool-facing behavior changes.

<details><summary>Risk Review Advice</summary>

Reviewers should confirm every path that changes `searchQuery` or `currentPage` now triggers its own load, since the watchers no longer do it implicitly: `startUpload` gained an explicit reset + `load()`, and navigation/breadcrumb/retry already load. Any future code that sets these refs directly will silently not reload, so the pattern is somewhat easier to break than the watcher version; pagination now depends on `BPagination`'s `@change` firing only on user interaction.

</details>
