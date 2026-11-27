Run via Claude Opus 5.5.

# Test challenges: tool_security_static_findings (judge removal and the repr()/file param fixes)

Scope: only the tests changed by the three newest commits on `0ad21214cce`. Earlier tests were challenged in `earlier_drafts/3/test_challenges_debrief.md` and were not challenged again.

The changes were folded into their commits as fixups, and the two commit messages were reworded to match. The new head is `53559de55d0`:

- `47de75304e2` Drop the language model judge (unchanged)
- `30fd8ee53f4` repr() as a Python literal (was `e78b2e4befe`)
- `53559de55d0` file param sanitized (was `70ffe7eeceb`)

`test/unit/tool_util/security` went from 824 to 822 passed. Each commit is green on its own: 807, 820 and 822. The generated docs section was regenerated at each commit. `test_docs_list_the_cases` and `test_spec_files_are_packaged` pass. ruff, black and isort are clean on `test_sources.py`. Direct mypy on the file reports only the file's existing `no-untyped-def` noise; there are two more, from one more test function.

## Red checks

The analyser exists only on this branch. So instead of running against dev, each new test was run with the revision's own change reverted, either the whole change or the single relevant line. Every revert was undone with `git checkout`.

| Revert | Went red | Stayed green |
|---|---|---|
| Whole `interp.py` of the repr() commit | spec `repr_python_literal`, `repr_inside_python_string`, `json_inside_python_string`; 7 of 10 literal rows | spec `repr_in_shell`; rows json.dumps outside a string, json.dumps in `'...'`, slice |
| Only `chars = chars - {"\\"}` (the review's backslash fix) | json.dumps in `'...'` row, once the clean rows check every severity (see below) | everything else |
| Only the slice dropping `quoted` | slice row `${repr($free)[1:-1]}` | everything else |
| `"file"` put back with the as-is types in `model._value` | spec `file_param_stays_quoted` | spec `raw_file_param_shell_injection`, `ftpfile_param_shell_injection` |

## Changes

- **`test_literal_in_python_configfile` split in two** (`test_sources.py`):
  - `test_literal_in_python_configfile_stays_one_string` covers the 4 clean shapes.
  - `test_literal_in_python_configfile_breakout` covers the 6 flagged shapes and pins `breakout`, `requires` and `context`.
  - A `python_script_findings` helper serves both. This removes the test's `if breakout is None: ... return` branch.
  - The clean rows now assert that `configfile:script` has no finding at any severity, not just no HIGH one. That makes the json.dumps-in-`'...'` row pin review item 4: the LOW "can escape the closing quote", which nothing else pinned.
- **Dropped spec case `repr_in_shell`** (with its tool and MANIFEST line). The commit says the shell reading of repr() is unchanged, and the case passes with the whole change reverted. repr() in the command is already pinned, with job-check characters, by `test_breakout`'s `echo "${repr(str($free))}"` and the two closers tests. If John wants it back for the admin docs, restore it from `e78b2e4befe`.
- **Dropped spec case `raw_file_param_shell_injection`** (with `file_param_raw.xml` and its MANIFEST line). It passes with the change reverted. After the change, a file param's raw value is built on the same fall-through path as a text param's, and `${text.value}` is pinned as RAW by `test_finding_names_its_source` and `raw_text_shell_injection`.

## Kept, though green with the change reverted

- **Spec `ftpfile_param_shell_injection`.** This is the only test anywhere of the as-is branch of `model._value` (color, directory_uri, ftpfile). It is the branch this commit edited. Without it, removing all four types, the security false negative the commit message rules out ("the other three types are unchanged"), would go unnoticed. It is a baseline-type pin. A separate "Baseline tests" commit is not possible, because the analyser does not exist before this branch. That is the same reasoning as in `earlier_drafts/3`.
- **Row `x = ${json.dumps($free)}` of the stays-one-string test.** This commit narrowed the early return to `not quote and ...`, and this row is the only pin of the side that clears json.dumps() written as code in a Python configfile. The test as a whole goes red with the change reverted.

## Process items

- **`47de75304e2`:** deleting `test_judge.py` is right, because its module is gone. No other test referenced the judge, `--judge`, `assessment` or `Report.assess()`, and the CLI tests never covered `--judge`. Nothing new is needed for a removed advisory field.
- **Mocks:** none in the changed tests. They review real tool XML through `_util.review`.
- **Layer:** this is a static library with no server, so unit and spec tests are the right layer. No API, integration or E2E test applies.
- **Spec and source overlap:**
  - Spec `repr_python_literal` matches rows `x = ${repr($free)}`.
  - Spec `repr_inside_python_string` matches `x = '${repr(str($text))}'`.
  - Spec `json_inside_python_string` matches `x = "${json.dumps(...)}"`.

  They assert different parts of the same result: the spec asserts rule, severity, accessor and checkable, and appears in the admin docs, while the rows assert breakout and context. This is the same split that earlier rounds accepted for `test_breakout`.

## Not done

- **`_ESCAPING_ADDS["pystr"]` has no test.** Removing the entry leaves all 824 tests green. It repeats what `introduced(..., escape=True)` records per ref, as the review noted, and `shlex` is listed both ways too. It was kept for the table's consistency. It is code, not test scope.
- **The review's open items 5, 6, 7, 9 and 11** are unchanged. They are not test issues.

## Status

READY.
