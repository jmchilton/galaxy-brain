# Implementation debrief

```
created .../tool_security_runtime/differential-review/snapshots/20261126T235029Z-revision-e3d98e549b74.json
  revision @ e3d98e549b74 vs jmchilton/tool_security_static_findings (merge-base d4e4f68dd259)
  first snapshot: 7 commits, 27 files, 95 hunks
```

**STATUS: BLOCKED on defaults.** `upload1` no longer blocks, but other Galaxy tools are still refused at the default. Head `e3d98e549b7` on `jmchilton/tool_security_runtime`. The earlier debrief is `earlier_drafts/1/implementation_debrief.md`; everything in it still holds except where this revision changes it.

## This revision

John decided on 2026-11-26 to exempt `upload1`, and `e3d98e549b7` does that.

- **Exemption.** `is_galaxy_upload_tool(path)` matches only Galaxy's bundled `upload.xml`, or a link to it, compared by real path. A tool that declares `id="upload1"` or `UploadToolAction` from any other path is still reviewed, and gets one WARNING naming both paths. This fails closed.
- **Cached toolbox.** `Tool.stored_source_path` carries the stored path, so the exemption also matches under the cached toolbox. `config_file` stays `None` there, as before.
- **Decided once per tool.** A `WeakSet` of tools with nothing to review is checked before `reviewed_tool_source`, so later jobs skip it.
- **Docs.** The config docs for `tool_security_review` and `when_unsure`, and the "Checking jobs" admin section, describe the exemption.
- **Shared helper.** It is byte-identical to branch 4's. Its eventual shared home is `galaxy.tools.special_tools`, on `tool_security_static_findings`.
- **Notes.** `subagents/upload1_exemption.md` (the implementation) and `subagents/review_upload1_exemption.md` (the review, all acted on except keeping the cached-toolbox integration class).

## Tests

- Unit suites (`test/unit/tool_util/security`, `test_security_review*.py`, `test_cached_tool.py`): 2531 passed.
- `test/integration/test_tool_security_review.py` alone: 11 of 11 passed. It now has upload1 tests under both the eager and the cached toolbox.
- `test_tools_upload.py::test_upload_posix_newline_fixes_by_default` and `test_libraries.py::TestLibrariesApi::test_create_dataset` both passed; both failed before the exemption.
- ruff, black and isort are clean; there are no new mypy errors.

## Decisions for John

1. **Remaining default refusals.**
   - Seventeen data source tools in `tool_conf.xml.sample` are refused on every job. Their command reads `$__app__.config.output_size_limit`, which gives `uncheckable-template-code`. A Galaxy-side fix was found in `stock_tools_review_clean`, and John deferred it on 2026-11-26.
   - Functional test tools are also refused: `model_attributes`, `config_vars`, `command_reads_configfile`, `command_reads_input_size`, `test_data_source` and `ucsc_tablebrowser`.
   - The defaults decision (options A–D in `earlier_drafts/1/implementation_debrief.md`) is still open for these.
2. Items 2–6 of the earlier debrief are still open: convergence with branch 4, Pulsar refusals, PR shape, inherited nits and re-sync.
