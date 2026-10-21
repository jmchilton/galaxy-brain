# faqs/galaxy/analysis_jobs_keep_running.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `ef6f75182e7` (`faq_server.sh main`). Replay:
`analysis_jobs_keep_running.gxui.sh`.

No breakage. A Cut1 job kept `running` after the browser closed (`gxui stop`), finished `ok`, and
showed in the history after logging back in. The upload caveat holds: local files upload from the
browser (`client/src/utils/tusUpload.ts`), and Galaxy asks "Are you sure you want to leave the
page?" while uploads are staged (`client/src/entry/analysis/App.vue`). The FAQ could mention that
prompt.

Galaxy findings from this run:
- **26.2's upload panel no longer converts line endings by default** (26.1: on), so a pasted
  table keeps no final newline, and Cut1 (`chop` in `cutWrapper.pl`) then drops the last field's
  last character. Filed as [#24311](https://github.com/galaxyproject/galaxy/issues/24311); the
  Cut1 side is left alone, since restoring the default fixes it.
