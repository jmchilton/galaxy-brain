# issue_23978_parameter_tools_xsd — test challenges debrief

Scope: `f66d1f0f97d..HEAD` (`977e2f3971a`, `8dcdee07d4b`, `ab7999ce965`, `04034197ef7`). Fresh pass, view formed before reading `earlier_drafts/2/`. No tests added, changed or dropped; no commits. The single test change (linter expected string gains `'rules'`) is sound and goes red on the parent XSD. The CI validation (the branch's real regression guard) selects the right 431 files and exits 1 on regressions in every subdir it covers, including the newly covered ones and the `rules` enum.

## Not acted on

- **No negative format-rejection test for the 5 now-restricting tools** (`gx_select_dynamic`, `gx_{conditional,repeat,section}_select_dynamic`, `gx_drill_down_code`). The restriction is incidental; these fixtures exist to exercise dynamic options / drill_down. Format matching is generic core behavior tested elsewhere. Their embedded framework tests (auto-sniffed `txt` / `tabular` data) already show the restriction accepts the intended inputs.
- **No dedicated `rules` linter/unit test.** CI XSD validation of `parameters/gx_rules.xml` catches removing it (verified below). The pinned linter message also changes with the enum. A third check would just re-assert the XSD.
- **`test_inputs_param_type` pins the full enum set (brittle).** Every future enum addition has to touch it. Loosening it to a substring would weaken the assertion, so left alone.
- **No E2E test.** No UI change.
- **Real `tox -e validate_test_tools` not run** (needs `common_startup.sh`). Ran the real scripts with only that line stubbed. CircleCI runs the real job.

## Observations (no test action)

- `for_tours/filtering.xml` and `expression_tools/` are symlinks to production tools (`tools/stats/filtering.xml`, `tools/expression_tools/*.xml`). After the re-scope, an XSD regression in those 3 production tools turns `validate_test_tools` red. That is probably desirable, but it is new coupling and worth a line in the PR description.
- The `*/*.xml` glob would pick up any non-tool `.xml` later dropped into a subdir (e.g. test data under `data/`). Today `data/` and `realtime/` contain no `.xml`. If one appears, CI fails loudly rather than letting it slip through silently.
- Not a test issue: a symlinked test tool edited with `perl -i`/`sed -i` gets replaced by a regular file (typechange). Restore with `git checkout`.

## Details

**Linter expectation** (`test/unit/tool_util/test_tool_linters.py::test_inputs_param_type`). It asserts libxml2's full enum-facet message, so adding `'rules'` at the end (matching XSD enum order) is the correct, non-weakening update. Red check: with the parent-tip `galaxy.xsd` swapped in, the test fails at that assertion. After restoring the XSD, it passes.

**CI script** (`.ci/validate_test_tools.sh` → `scripts/validate_tools.sh`). Copied both scripts to a scratch dir, stubbed the `common_startup.sh` line and pointed `cd` at the worktree. Ran them with the worktree `.venv`.
- Green: exit 0, 431 ok, 0 not ok. Subdir contents check out: `for_workflows/` 17, `expression_tools/` 2 (`expression_macros.xml` excluded by `*_macros.xml`), `deprecated/` 1, `for_tours/` 1, `parameters/` (minus `macros.xml`). No `.xml` in `data/` or `realtime/`, and none nested 2 levels down.
- Red (one combined run): injected an invalid `bogus_attr` on the first `<param>` in `parameters/gx_data.xml`, `for_workflows/head.xml`, `deprecated/simple_constructs_24_2.xml`, `for_tours/filtering.xml`, `expression_tools/pick_value.xml` and top-level `simple_constructs.xml`, and removed `<xs:enumeration value="rules"/>` from the XSD. Result: exit 1, with `not ok` for exactly those 6 tools plus `parameters/gx_rules.xml`.
- Fail fast: appended junk to `galaxy.xsd` → xmllint parser error, exit 1, 0 tools run.
- Everything restored with `git checkout`, including the typechanged symlink. Worktree clean at `04034197ef7`.

**Consumers of the 5 restricted tools.** Exact-id grep over `lib/galaxy_test`, `test`, `client/src` and `lib/galaxy/tool_util`: only `test_parameter_convert.py` / `parameter_specification.yml` reference them, and both are state-level and format-agnostic. No API or client tests.

**Unit runs.** `test_tool_linters.py` + `test_parameter_specification.py` + `test_parameter_test_cases.py`: 172 passed. `test_parameter_specification_json_schema.py` + `test_parsed_tool_model.py` + `test_parameter_convert.py`: 34 passed.

**writing_tests.md.** Tool-XML hygiene is guarded by the `validate_test_tools` tox env, and tool behavior by framework tests in `test/functional/tools/`. Both layers are already the right ones, and nothing needs to move between layers. `test/functional/tools/CLAUDE.md`'s claim that validation "checks all test tools in the directory" is now accurate after the re-scope.

**Comparison with earlier draft** (`earlier_drafts/2/test_challenges_debrief.md`, read afterwards). Same conclusions. That draft's "XSD lint exit status ignored" item is fixed by `977e2f3971a` (verified above). New here: red checks for each newly covered subdir, the production-tool symlink coupling, and the brittle-pin note.
