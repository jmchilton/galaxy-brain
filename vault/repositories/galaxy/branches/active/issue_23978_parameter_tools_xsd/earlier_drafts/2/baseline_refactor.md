Split the `.ci/validate_test_tools.sh` fixes (XSD lint path, fail-fast, shellcheck-clean `ls | grep` -> glob + `case` loop) into a behavior-preserving commit on the base (`f66d1f0f97d`) ahead of the `parameters/` fix.

## Restructure

Old head `935eee9c5f2` (backup branch `issue_23978_parameter_tools_xsd_pre_baseline_refactor`, local only). Final tree identical (`git diff 935eee9c5f2 HEAD` empty).

| New | Was | What |
|---|---|---|
| `977e2f3971a` Fix validate_test_tools XSD lint path and fail fast on lint errors | part of `bbda1d165f1` + all of `935eee9c5f2` | Lint path `tools/xsd` -> `tool_util/xsd`, `\|\| exit 1`, glob + `case` loop over top-level `*.xml` only. Tool list identical to the old `ls \| grep` (310 files). |
| `8dcdee07d4b` Make framework parameters/ test tools XSD-valid and validate them in CI | rest of `bbda1d165f1` | Tool XML fixes, `rules` in `ParamType`, linter test expectation, and a 2-line script change: add `parameters/*.xml` to the glob, exclude `parameters/macros.xml`. |
| `ab7999ce965` Document rules, group_tag and directory_uri param types in the XSD | `2bd2d9cf1b4` | Unchanged. |

## Why

- The lint path bug and ignored exit status are pre-existing CI defects unrelated to #23978; landing them first makes the feature commit's script diff just "also validate `parameters/`".
- Folds the trailing fail-fast fixup into the commit it belongs with.
- Base stays green: base XSD lints clean, top-level tool list unchanged.

## Checks (each new commit)

- `shellcheck .ci/validate_test_tools.sh`
- `.ci/validate_test_tools.sh` file list run through the `scripts/validate_tools.sh` loader + `xmllint --schema` loop (minus `common_startup.sh`)
- `pytest test/unit/tool_util/test_tool_linters.py`

| Commit | shellcheck | XSD validation | linter tests |
|---|---|---|---|
| `977e2f3971a` | clean | 310/310 ok (base list) | 136 passed |
| `8dcdee07d4b` | clean | 410/410 ok | 136 passed |
| `ab7999ce965` | clean | 410/410 ok | 136 passed |

The branch was not pushed. The `jmchilton` fork still has the old head `935eee9c5f2`, so the next push needs `--force-with-lease`.
