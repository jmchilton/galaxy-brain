# faqs/galaxy/analysis_jobs_keep_running.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ef6f75182e7` (`faq_server.sh main`). Replay:
`analysis_jobs_keep_running.gxui.sh`.

No breakage. A Cut1 job kept `running` after the browser closed (`gxui stop`), finished `ok`, and
showed in the history after logging back in. The upload caveat holds: local files upload from the
browser (`client/src/utils/tusUpload.ts`), and Galaxy asks "Are you sure you want to leave the
page?" while uploads are staged (`client/src/entry/analysis/App.vue`). The FAQ could mention that
prompt.

Galaxy findings from this run:
- **Cut1 lost the last character of a final line with no newline** (`chop`). Fixed with `chomp`
  (`ab809115f5e`). No tool test can go red for it: tool-test uploads always convert to POSIX
  lines, which adds the newline.
- **26.2's upload panel no longer converts line endings by default** (26.1: on). That's why the
  pasted table had no final newline. Queued: `gx_issues/to_file/upload_posix_lines_default_off.md`.
