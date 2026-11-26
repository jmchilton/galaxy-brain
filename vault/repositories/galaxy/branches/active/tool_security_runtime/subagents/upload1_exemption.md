# upload1 exemption (job-preparation review)

Commit `e3d98e549b7` on `tool_security_runtime`, pushed to `jmchilton` as a fast-forward over `26e15a538bd`, exempts Galaxy's own `upload1` from the job-preparation review, under both the eager and the cached toolbox. John decided on this on 2026-11-26.

- The review's findings (`subagents/review_upload1_exemption.md`) were folded in with a fixup and an autosquash.
- Earlier unpushed versions: `95b0794a40e` (left the cached-toolbox gap) and `69080fb376c` (before the review).
- The data source tools in the sample `tool_conf` are still refused by default. That was not acted on, because John decided only on upload1.

Not acted on:

- **Passing `config_file` to cached-toolbox tools.** It would change the cached toolbox's error keys, `to_archive` and logging. A separate attribute is used instead (below).
- **Review items left as is:** the review found no bypass. The cached-toolbox integration class (item 7) stays as it is, and the review's optional test trims were skipped.
- **Other default refusals.** A scan of the sample and functional-test tool confs with `_no_plain_value()` finds these tools. Every job of each is refused at `enforce_code` + `strict`:
  - Sample `tool_conf.xml.sample`: 17 data source tools, all `uncheckable-template-code` from `$__app__.config.output_size_limit`:
    - `ucsc_tablebrowser*`, `sra`, `ebi_sra`, `*mine`, `*modencode`, `wormbase`, `eupathdb`, `hbvar`, `diced`
    - Earlier notes did not list these. They are probably the biggest remaining default problem.
  - Functional test tools:
    - `model_attributes`: `uncheckable-untraced-value`
    - `command_reads_configfile`: both codes
    - `config_vars`, `command_reads_input_size`, `test_data_source`, `ucsc_tablebrowser`: `uncheckable-template-code`

## Predicate and placement

`is_galaxy_upload_tool(path)`: `os.path.realpath(path)` equals the real path of `lib/galaxy/tools/bundled/data_source/upload.xml`. Only a tool file at Galaxy's bundled path, or a link to it, matches.

- **Where it is checked.** `reviewed_tool_source()` returns None for it, next to the existing `tool_type_local`/user-defined/expression/no-command skips. It is passed `_tool_file(tool)`, which returns `StrPath | None`: `tool.config_file`, or else `tool.stored_source_path`.
- **Which installs it covers.**
  - Source checkout: `bundled` is a symlink to `tools/`, which the default `tool_path` points at.
  - Installed package: `bundled` is the real directory.
  - `test/functional/tools/upload.xml` is a symlink to the same file.
- **Why a path and not the id or the action.**
  - Galaxy's job code tells the upload tool by `id == "upload1"`, but any local tool can declare that id or `UploadToolAction`. The docstring now says the path check is stricter on purpose.
  - Tool Shed tools load from the shed tool path and get guid ids.
  - User-defined tools have no file and are skipped earlier.
  - Only an admin can put a file at Galaxy's own path.
- **Cached toolbox.**
  - `CachedToolBox._create_tool_from_stored_source` builds tools from stored text without a `config_file`.
  - It now also sets the new class attribute `Tool.stored_source_path = stored.source_path` (default `None`).
  - `config_file` stays None, so error keys, `to_archive` and logging do not change. Only the review reads the new attribute.
- **Decided once per tool (review item 3).**
  - Before calling `reviewed_tool_source`, `ToolSecurityReviewer.review()` checks a `WeakSet` of tools that have no source to review: upload1, tools without a command, and the other skipped types.
  - Each `Tool` object is decided once. Later jobs of upload1, `__DATA_FETCH__` and similar tools skip the gate and its `realpath` calls.
- **Logging.**
  - INFO, once per tool object, when Galaxy's own upload1 is exempt.
  - WARNING, once per tool (it is computed once per review), when a reviewed source declares id `upload1` and `galaxy.tools.actions.upload`/`UploadToolAction` from another path. The message names the tool's path and the bundled file (`upload_tool_lookalike_message`).
  - The lookalike still fails closed.

## Convergence with branch 4

Branch 4 (`60e85e935d2`) carries byte-identical copies of these, so they can later move to one shared module, for example `galaxy.tools.special_tools`:

- `_GALAXY_UPLOAD_TOOL`
- `_UPLOAD_ACTION`
- `is_galaxy_upload_tool()`
- `declares_upload_tool()`
- `upload_tool_lookalike_message()`

Two differences:

- **Patches.** Branch 4 adds its tool-patch condition at its own call site. Branch 3 has no tool patches. When the branches converge, branch 3's reviewer reads the patched `tool.tool_source`, so the patch condition should come along.
- **The `lib/galaxy` rule.** Branch 4's rule uses `abspath`. In an installed package it already exempts every bundled tool, including a patched upload1.

## Tests

- **Unit, red then green.** `test_security_review.py`:
  - `test_galaxy_upload_tool_path`
  - `test_galaxy_upload_tool_is_exempt_at_every_level`: all 3 enforce levels × `strict`/`refuse`, logged once per reviewer.
  - `test_galaxy_upload_tool_exemption_is_decided_once_per_tool`: three jobs, one `reviewed_tool_source` call.
  - `test_upload_tool_from_a_tool_source_store_is_judged_by_its_stored_path[galaxy | lookalike]`
  - `test_upload_tool_lookalike_is_reviewed[upload.xml | data_source/upload.xml]`: a copy is refused with `uncheckable-template-code`, and exactly one WARNING names both paths.

  `test_cached_tool.py`:
  - `test_materialized_tool_keeps_its_stored_source_path`

  Each new behaviour was red before its change.
- **Unit suites:** `test/unit/tool_util/security`, `test_security_review*.py` and `test_cached_tool.py`: 2531 passed.
- **API, one at a time:**
  - `test_upload_posix_newline_fixes_by_default` passed on the default config.
  - The same test with `GALAXY_CONFIG_OVERRIDE_USE_CACHED_TOOLBOX=true` was red before the cached-toolbox seam and green after.
  - `test_libraries.py::TestLibrariesApi::test_create_dataset` was red with the exemption reverted and green with it.
- **Integration:** `test/integration/test_tool_security_review.py`, which includes `test_galaxy_upload_tool_runs` and the `TestToolSecurityReviewDefaultsCachedToolbox` class. Run alone: 11 of 11 passed.
- **Static checks:**
  - ruff, black and isort are clean.
  - mypy finds no new errors in `security_review.py` or `cached_toolbox.py`; the one left in `security_review.py` was already there.
  - The test file gains `no-untyped-def` errors only, because it is unannotated like the rest of the file.

## Docs

- `tool_security_review.md` "Checking jobs":
  - says what is not reviewed and why upload1 is exempt;
  - says the review would refuse every upload "at the default settings";
  - says "the file at Galaxy's bundled path";
  - says a copy is reviewed and gets a warning that names the bundled file.
- Both `tool_security_review` and `tool_security_review_when_unsure` now say that upload1 is not reviewed at any level. The sample and rst were regenerated.
