# issue_23978_parameter_tools_xsd — test challenges debrief

Scope: `f66d1f0f97d..HEAD` (`bbda1d165f1`, `2bd2d9cf1b4`). No tests added, changed or dropped; no commits. The one test change (linter expected-string gains `'rules'`) is sensible: extends a pre-existing hardcoded enum set, not a weakening, and fails red on the parent XSD. CI validation verified to select `parameters/*.xml` and to exit 1 on both regression kinds.

## Not acted on

- **No negative format-rejection test for the 5 now-restricting tools.** Restriction is incidental to fixtures whose subject is dynamic options / drill_down. Format compatibility is generic core behavior tested elsewhere; framework tool tests have no clean way to assert request-time rejection. Existing embedded framework tests (auto-sniffed `simple_line.txt` / `1.tabular`) already prove the restriction accepts the intended data (10/10 in initial debrief, both tool APIs).
- **No extra `rules` test.** Linter expectation + CI XSD validation of `parameters/gx_rules.xml` cover it; anything more would re-assert XSD content.
- **XSD lint exit status ignored in `.ci/validate_test_tools.sh`** (`xmllint --noout` result not checked). Pre-existing; a malformed XSD fails every per-tool `--schema` run, so CI still goes red.
- **No E2E test.** No UI change.
- **Other never-validated subdirs** (`for_workflows/` etc.) out of scope (already noted in initial debrief).
- **Real `tox -e validate_test_tools` not run** (runs `common_startup.sh`); ran the real scripts with only that line stubbed.

## Details

**Linter expectation (`test/unit/tool_util/test_tool_linters.py::test_inputs_param_type`).** Asserts the full xmllint enum-facet message, so any enum change must touch it. Extending with `'rules'` is the correct, non-weakening update. Red check: parent-tip `galaxy.xsd` swapped in → test fails at that assertion; restored → passes.

**CI coverage (`.ci/validate_test_tools.sh` → `scripts/validate_tools.sh`).** Ran copies of both scripts (only `common_startup.sh` stubbed, same `cd`/paths) with repo `.venv`:
- Green: exit 0, 410 ok, 100 of 101 `parameters/*.xml` included (only `macros.xml` excluded). `upload.xml` / `*_conf.xml` exclusions equivalent to old `grep -v` (no other filenames contain `upload.xml`).
- Red: re-introduced `ext="txt"` in `gx_select_dynamic.xml` and removed `rules` enum from XSD → exit 1, `not ok` for `parameters/gx_rules.xml` (enum facet) and `parameters/gx_select_dynamic.xml` (`ext` not allowed). Pipeline exit is xmllint's; a loader failure feeds empty input to xmllint and also fails.
- Temp copies removed; worktree clean.

**Consumers of the 5 tools.** Exact-id grep: no API/client tests reference them; only `test_parameter_convert.py` / `parameter_specification.yml` (state-level, format-agnostic). `test_tool_execute.py` hits were `gx_select_dynamic_empty*` (different tools).

**Unit runs.** `test_tool_linters.py`, `test_parameter_convert.py`, `test_parameter_specification.py`: 165 passed.

**writing_tests.md.** Tool-XML behavior belongs in framework tests (`test/functional/tools/`), which is where the existing coverage lives. Nothing to move between layers.
