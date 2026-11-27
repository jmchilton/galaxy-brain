# Implementation debrief

```
created .../tool_security_runtime/differential-review/snapshots/20261126T235029Z-revision-e3d98e549b74.json
  revision @ e3d98e549b74 vs jmchilton/tool_security_static_findings (merge-base d4e4f68dd259)
  first snapshot: 7 commits, 27 files, 95 hunks
```

**STATUS: BLOCKED on defaults.** `upload1` and the data source tools no longer block, but some functional test tools are still refused at the default. Head `9e7e9cf38a0` on `jmchilton/tool_security_runtime`. The earlier debrief is `earlier_drafts/1/implementation_debrief.md`; everything in it still holds except where this revision changes it.

## Rebase onto `76a196cdabf` (2026-11-27)

t7t asked for this rebase: `git rebase --onto 76a196cdabf d4e4f68dd25`. Branch 1's new commit allows the exact `$__app__.config.output_size_limit` read.

- **Conflicts.** The spec commit (now `0f5a7a74344`) conflicted in `cases.yml` and in the generated spec section of the admin doc. I kept both sides and regenerated the section with `python -m galaxy.tool_util.security.spec.docs`.
- **Jobs for the new cases.** This branch requires every case to have jobs.
  - `output_size_limit_read` gets a green job that runs.
  - `output_size_limit_reach` gets `code: uncheckable-template-code`, a red job (refused), and a green job (runs and warns under `when_unsure: log`).
  - The spec runner's `MockAppConfig` gets `output_size_limit = 0`, matching `GalaxyAppConfiguration`.
- **Data source tools.** Of the 18 data source tools in `tool_conf.xml.sample`, the old head gave 17 an uncheckable reason that `strict` refuses outright. The new head gives none, measured with this branch's reviewer and `_no_plain_value()`.
- **Tests.**
  - Unit suites (`test/unit/tool_util/security`, `test_security_review*.py`, `test_cached_tool.py`): 2542 passed.
  - `test/integration/test_tool_security_review.py` alone: 11 of 11.
  - Force-pushed with a lease on `e3d98e549b7`.

## upload1 exemption (2026-11-26)

John decided on 2026-11-26 to exempt `upload1`. The exemption is commit `9e7e9cf38a0`, which was `e3d98e549b7` before the rebase.

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
   - The data source tools are resolved by the rebase onto `76a196cdabf`.
   - Functional test tools are still refused: `model_attributes`, `config_vars`, `command_reads_configfile`, `command_reads_input_size`, `test_data_source` and `ucsc_tablebrowser`.
   - The defaults decision (options A–D in `earlier_drafts/1/implementation_debrief.md`) is still open for these.
2. Items 2–6 of the earlier debrief are still open: convergence with branch 4, Pulsar refusals, PR shape, inherited nits and re-sync.
