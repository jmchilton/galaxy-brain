# upload1 exemption (job-preparation review)

Commit `69080fb376c` on `tool_security_runtime` (not pushed) exempts Galaxy's own `upload1` from the job-preparation review under both the eager and the cached toolbox, as John decided on 2026-11-26. It replaces the first version, `95b0794a40e`, which left upload1 refused under `use_cached_toolbox`; the fix was folded in before any push. The data source tools in the sample `tool_conf` are still refused by default, and that was not acted on; John decided only on upload1.

Not acted on:

- **Passing `config_file` to cached-toolbox tools.** Not done: it would change the cached toolbox's error keys, `to_archive` and logging. The separate attribute below leaves `config_file` alone.
- **Other default refusals.** A scan of the sample and functional-test tool confs with `_no_plain_value()` finds these tools, every job of which is refused at `enforce_code` + `strict`:
  - Sample `tool_conf.xml.sample`: 17 data source tools (`ucsc_tablebrowser*`, `sra`, `ebi_sra`, `*mine`, `*modencode`, `wormbase`, `eupathdb`, `hbvar`, `diced`), all `uncheckable-template-code` from `$__app__.config.output_size_limit`. Earlier notes did not list these. They are probably the biggest remaining default problem.
  - Functional test tools: `model_attributes` (`uncheckable-untraced-value`), `config_vars` (`uncheckable-template-code`), `command_reads_configfile` (both codes), `command_reads_input_size`, `test_data_source` and `ucsc_tablebrowser` (`uncheckable-template-code`).

## Predicate

`is_galaxy_upload_tool(path)`: `os.path.realpath(path)` equals the real path of `lib/galaxy/tools/bundled/data_source/upload.xml`.

- `reviewed_tool_source()` returns None for it, next to the existing `tool_type_local`/user-defined/expression/no-command skips. It is passed `_tool_file(tool)`: `tool.config_file`, or else `tool.stored_source_path`.
- **Cached toolbox.** `CachedToolBox._create_tool_from_stored_source` builds the materialized `Tool` from stored text without a `config_file`, so the path check could not match there. It now also sets `tool.stored_source_path = stored.source_path`. `Tool.stored_source_path` is a new class attribute, `None` by default. `config_file` stays None on those tools, so error keys, `to_archive` and logging don't change. Only the review reads the new attribute.
- The path covers every Galaxy install. In a source checkout, `bundled` is a symlink to `tools/`, which is what the default `tool_path` points at. In an installed package, `bundled` is the real directory. `test/functional/tools/upload.xml` is a symlink to the same file.
- **Why a path and not the id or the action.** Galaxy's own upload special cases key on `id == "upload1"` (`jobs/__init__.py`, `evaluation.py`, `abstract_tool.py`), but any local tool can declare that id or `UploadToolAction`.
  - Tool Shed tools load from the shed tool path and get guid ids.
  - User-defined tools have no file and are skipped earlier anyway.
  - Only an admin can put a file at Galaxy's own path.
- **Logging.** `ToolSecurityReviewer.review()` logs at `INFO`, once per tool object (a `WeakSet`), that the tool is not reviewed because Galaxy's own upload tool is exempt. It does not log per job.

## Convergence with branch 4

Branch 4 (`6e28b7debd8`) needs no cached-toolbox change: it decides at load, where the path is known. It carries a byte-identical `_GALAXY_UPLOAD_TOOL` and `is_galaxy_upload_tool()`, and calls them from its load-time gate `reviews_tool()`. Branch 4's `lib/galaxy` rule uses `abspath`, not `realpath`. In an installed package, `bundled` is under the galaxy package, so that rule already exempts every bundled tool there, but not in a source checkout. This is left unchanged, as asked. When the branches converge, the shared helper can move to one module (for example `galaxy.tools.special_tools`).

## Tests

- **Unit, red then green** (`test_security_review.py`):
  - `test_galaxy_upload_tool_path`
  - `test_galaxy_upload_tool_is_exempt_at_every_level`: all 3 enforce levels × `strict`/`refuse`, with the log said once per reviewer
  - `test_upload_tool_lookalike_is_reviewed[upload.xml | data_source/upload.xml]`: an exact copy elsewhere is still refused with `uncheckable-template-code`

  - `test_upload_tool_from_a_tool_source_store_is_judged_by_its_stored_path[galaxy | lookalike]`: a tool with no `config_file` is judged by `stored_source_path`
  - `test_cached_tool.py::test_materialized_tool_keeps_its_stored_source_path`: the seam; `config_file` stays None and the stored path is kept

  Red: the exemption tests failed and the lookalikes passed. The two cached-toolbox tests were red before the seam existed. Green: all pass.
- **Unit suites:** `test/unit/tool_util/security`, `test/unit/app/tools/test_security_review*.py` and `test_cached_tool.py`: 2530 passed.
- **API, one at a time, default config:**
  - `test_tools_upload.py::TestToolsUpload::test_upload_posix_newline_fixes_by_default`: passed.
  - The same test with `GALAXY_CONFIG_OVERRIDE_USE_CACHED_TOOLBOX=true`: red before the seam (`uncheckable-template-code`, server log `Using CachedToolBox`), green after.
  - `test_libraries.py::TestLibrariesApi::test_create_dataset` (legacy library upload through upload1): red with the change reverted (`[uncheckable-template-code] ... 'Upload File' (upload1 version 1.1.7)`), green with it.
- **Integration:** `test/integration/test_tool_security_review.py` gained `TestToolSecurityReviewDefaults.test_galaxy_upload_tool_runs` and a `TestToolSecurityReviewDefaultsCachedToolbox` subclass (`use_cached_toolbox: true`).
  - Red with only the seam reverted: the eager test passed and the cached one failed (`uncheckable-template-code`).
  - Green, whole file alone: 11 of 11 passed.
- **Static checks:** ruff, black and isort are clean. mypy on the changed files adds no errors in `security_review.py` or `cached_toolbox.py`. The test file gains 5 `no-untyped-def` errors, because it is unannotated like the other 81 already there.

## Docs

- `tool_security_review.md` "Checking jobs" gains a paragraph on what is not reviewed and why upload1 is exempt, including that copies are reviewed.
- The `tool_security_review_when_unsure` description names upload1. The sample and rst were regenerated.
