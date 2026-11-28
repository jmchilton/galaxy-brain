# Test challenges debrief

Scope: the tests that `1452f233609..4c7840f8806` added or changed, for the sweep fixes: `absent:`, job-parameter reads, FN-3, FN-4, `$self.getVar`, FN-5, FN-6, FN-7, FP-2, FP-4, FP-16, FP-3, the `#echo` lines, FP-14, FP-10, FP-11, the job-check marks and FN-1. That covers:

- `test/unit/tool_util/security/test_review.py`, `test_spec.py` and `test_sources.py`;
- `test/unit/app/tools/test_security_review.py`, and the new `test_security_review_datasets.py`;
- the spec cases in `spec/cases.yml`, which `test_spec.py` and `test_security_review_spec.py` run.

The earlier challenges are in `earlier_drafts/1/` and `earlier_drafts/2/`, and I didn't redo them.

## Verdict

The tests are at the right layer. Every unit row is a black-box row through `review_tool_source`. There are no mocks, and the spec cases run real tool XML through real jobs with harm checks. I ran 119 mutations of the new code paths, 2 to 12 per cause. Against the tests as they stood, 88 turned a test red at its own assertion and 31 survived. 17 of the survivors were real gaps, and I added a test for each. Each new test fails under its mutation, at exactly one assertion, and passes at the head. The other 14 survivors are masked by another reading, can't be observed, or would only over-report (details below).

I dropped 27 unit rows that repeat a spec case: the same template shape, the same param reading, and the same rule and severity. 24 of them went in a commit of their own, and the 3 FN-1 rows went in FN-1's fixup. One parametrized test became a plain test.

## Commits

The final order of the last commits:

| commit | what |
|---|---|
| `366093311e2` | Drop the unit rows a spec case pins from the tests of the sweep fixes (24 rows; one parametrized test becomes a plain test) |
| `f8955682e6d` | Pin what mutations of the sweep fixes left untested in their tests (14 rows and 2 tests, for 15 gaps) |
| `28bb64893ed` | Job check, held. Its content is unchanged: `git range-diff` shows `=` against `501c8fefa56`. |
| `a758723250d` | FN-1, held. It now includes a fixup that drops 3 rows and adds 2 tests. Only `test_review.py` changed. |

`a4329243423` and the commits before it are untouched. Nothing is pushed. All the test changes are in `test/unit/tool_util/security/test_review.py`. No analyser code changed, so the regression corpus run wasn't needed.

## Rows dropped as duplicates of a spec case

| cause | dropped row (shape) | spec case that pins it |
|---|---|---|
| FN-6 | `tool ${repr(str($text))}` contained | `repr_unquoted_is_one_word` |
| FN-6 | `tool '${repr(str($text))}'` medium | `repr_closes_shell_single_quotes` |
| FN-3 | `os.system('tool $text')` medium | `python_os_system_is_shell` |
| FN-3 | `os.system('tool $expr_no_quote')` high | `python_os_system_raw_value` |
| FN-3 | `print('tool $text')` none | `python_print_is_not_shell` |
| FN-4 | `x = f${json.dumps(...)}` high, `x = ${json.dumps(...)}` none | `json_inside_fstring`, `json_python_literal_clean` |
| FN-5 | `tool $(cat '$input')` split | `dataset_content_command_substitution` |
| FN-5 | `--name "$(cat '$input')"` none | `dataset_content_substitution_quoted` |
| `$self.getVar` | `tool '${self.getVar('free')}'` high | `getvar_self` |
| FN-7 | `tool $letters` medium, `'$letters.unsanitized'` high | `check_values_false_ignores_param_sanitizer`, `check_values_false_unsanitized` |
| FP-2 | `"$col" "$col.value"` validated, none | `color_param_validated`, `color_value_validated` |
| FP-16 | `$mode['kind'] == 'y'` / `== 'x'` | `conditional_selector_by_subscript_narrows`, `..._keeps_its_case` |
| FP-3 | `tool $p` low, `tool $p 'a;b'` medium | `unquoted_quotes_only_regroup_words`, `unquoted_quotes_before_quoted_operators` |
| FP-14 | `tool $p`, `"\\" + str($p)`, `"\\".strip()` + value, `` `echo $p` `` | `backslash_mapping_escapes_redirect`, `..._after_template_backslash`, `..._after_computed_backslash`, `..._in_backticks` |
| FP-10 | `'\''` written by replace() in single and in double quotes, `replace('x', "'")` | `replace_writes_single_quote_escape`, `replace_single_quote_escape_in_double_quotes`, `replace_that_adds_a_quote_breaks_escape` |
| FN-1 (fixup) | `ruleplot -conf '$script'`, the staged copy for `ruleplot`, `python3 tracks.py --out x '$script'` | `config_rule_expression_is_code`, `config_rule_file_staged_is_code`, `config_track_list_is_paths` |

Rows that pin a limit or a variant the spec doesn't have stay. Examples are the option spellings for FN-1, the `colors_validated=False` row, the nested-section selector rows and the backtick form in double quotes. Every mutation in the sample ran against the tests after the drops, so the counts below already reflect them. Batch 1 also ran before the drops, and its results match exactly.

## Mutation results

The counts are against the tests after the drops. The static mutations ran with the whole unit suite (`test/unit/tool_util/security` and the two `test/unit/app/tools` files). The mutations of the job check, FN-1, FN-3's escape mark and FP-14's path rule also ran the matching spec jobs. I also ran the spec jobs for each survivor before judging it.

| cause | red / run | survivors that were real gaps, now pinned | survivors left (why) |
|---|---|---|---|
| `absent:` | 3/3 | | |
| job-parameter reads | 7/9 | | JP3, JP8: masked (below) |
| FN-3 | 6/7 | `subprocess.Popen` dropped from the sinks | |
| FN-4 | 1/1 | | |
| `$self.getVar` | 2/4 | | SG2, SG3: masked |
| FN-5 | 5/10 | output of the first command of a list (`;`), `grep --`, `$input.path`, `1>`, the strict check's read of content in a quoted substitution | |
| FN-6 | 6/7 | repr() inside `$'...'` | |
| FN-7 | 4/6 | color and directory_uri params of a tool without wrappers | F7c: masked |
| FP-2 | 4/5 (rgb is red in its spec job) | a colour in a repeat, `colors_validated=False` | |
| FP-4 | 4/6 | `_element_identifier` read as the identifier, so the job check can check it | P4e: unobservable |
| FP-16 | 2/3 | | P16c: unobservable |
| FP-3 | 6/8 | a value of plain words written elsewhere in words that can name a file; a backslash inside single quotes | |
| `#echo` lines | 5/6 | an `#echo` closed by `#` at the start of its line | |
| FP-14 | 7/10 | `strip()` of a value whose spaces the sanitizer escapes | B6, B9: masked |
| FP-10 | 6/7 | replace() with a count writing `'\''` | |
| FP-11 | 3/6 | | R2, R3, R6: masked |
| job-check marks | 9/9 | | |
| FN-1 | 8/12 | a newline in a string of a rule file; a track-list value outside the strings, which can add markup | C10, C12: over-report only |

What each pinned gap was:

- **FN-3**: a string that `subprocess.Popen(..., shell=True)` runs was not tested as a sink. Without it, the value written there gets no finding.
- **FN-5**:
  - Dropping what an earlier command of a list writes (`$(cat x; echo ok)`) lost the content.
  - Treating `2>` like `>` passed every test, and treating only a bare `>` as a file write did too. Both are now pinned.
  - `grep --` and `.path` weren't tested.
  - Without the `_written` entry, content in a quoted substitution is missing from `report.reads`. Then the strict check never reads it.
- **FN-6**: repr() inside `$'...'` was untested. The mutation reads it as quoted: no finding instead of medium.
- **FN-7**: dropping `and wrapped` from the color, directory_uri and ftpfile branch reads those params of a tool without wrappers as raw: high instead of low.
- **FP-2**: `colors_validated` wasn't passed through repeats. An older Galaxy's colour in a repeat then reads as validated.
- **FP-4**: without the `_element_identifier` reading, the wrapper's own identifier reads as an opaque value. The findings stay the same, but they are no longer checkable, so every job is refused.
- **FP-3**: without the `_splits` check, a medium finding that shares its key with a plain-words finding is lowered to low. A backslash in single quotes, read as an escape, hid a quoted `;`. The older row `'a\$b'` doesn't pin this, because Cheetah turns `\$` into `$`, so the template text has no backslash.
- **`#echo` lines**: `#echo expr#` at the start of a line, with text after it, was placed one line too far down.
- **FP-14**: `strip()` that leaves an escaped space's backslash at the end kept the escape credit. The mutation reported no high finding.
- **FP-10**: replace() with a count escapes only the first quote, but was read as a full `'\''` escape.
- **FN-1**:
  - A value that can hold a newline but not the string's quote ends the string with the line. Read inside the string, it was low instead of high.
  - A value outside the quotes of a track list can open markup. That `<` branch was untested.

The survivors I left:

- **JP3** (`dir({})` removed from `answered_before_namespace`) and **JP8** (getVar literal names not added to the fallback). Both are masked: the analysis reads these names as job parameters itself. I couldn't find a template where only the fallback read changes. A related point that is older than this branch: the analysis reads `$items` as a job parameter, but Cheetah finds `items` on the frame's locals dict first. That is an over-read, not a gap.
- **SG2 and SG3** (the getVar receiver and name checks). Masked: `$text.getVar(...)` and `$self.<other>(...)` get the same findings either way.
- **F7c** (`Value.raw` without wrappers). No template path I found reaches `raw()` of an unwrapped value: string methods bind to `as_text`.
- **P4e** (serialize of a multiple input as one dict). The element and dict readings give the same findings.
- **P16c** (`key.isidentifier()`). A non-identifier key never names a selector.
- **B6** (a removal undoing a backslash escape). A narrowing that drops the backslash also drops what it escapes.
- **B9** (the join check of literal text). Masked by the quote check that runs before it.
- **R2, R3 and R6** (the local, single-literal and plain-name checks for a re.sub pattern). Masked: the interpreter's own `_literal` resolution gives the same answer for `#def` frames, computed locals and attribute patterns.
- **C10** (either parenthesis instead of both) and **C12** (a quoted whole value counted as an expression). These would only over-report.

### The "red before its fix" claim

I spot-checked it with the mutations that revert a fix's main condition, about 3 per cause: A1, JP1, JP2, F3a, F3c, F4a, SG1, SG4, F5a, F5d, F6d, F7a, F7b, P2a, P2c, P4c, P16a, P3a, P3c, E1, E3, B1, B7, T1, T3, R1, R4, J2, J5, C1, C3 and C4. Each one turned that cause's new rows red at an assertion, not at an import or a fixture. The claim holds. I found no new row that passes without its fix, apart from the regression-guard rows, which pin limits and are meant to pass either way.

## Other challenges

- **Implementation tests.** `test_security_review_datasets.py` calls `Data(...).attr(...)` directly. It's a sync test between the analyser's member table and Galaxy's model and wrappers, so it has to enumerate them, and a spec case can't do that. I kept it. The job-check tests call `_file_text` and `_Content`. The scanner is the unit under test there, and the chunk-boundary rows need 1 MB files. `test_a_line_of_content_that_starts_with_a_dash_is_refused` covers the same behaviour through `check_job`. I kept them.
- **`test_absent_findings`** tests the spec harness's matcher, with 5 small rows. All 3 mutations of it were red. I kept it.
- **SimpleNamespace job stubs.** The new job-check test copies the stub that about 15 older tests in `test_security_review.py` use. Replacing it with a shared dataclass stub would be a cleanup of those older tests, outside this scope. It's recommended as a follow-up.
- **E2E or API tests.** There is no UI, and the spec jobs already run the real evaluators, so none are needed.

## Checks

- At the head (`a758723250d`):
  - `test/unit/tool_util/security`, `test_security_review.py` and `test_security_review_datasets.py`: 1147 and 161 passed.
  - `test_security_review_spec.py -n 3`, run alone: 4136 passed in 7 minutes.
- At each new commit before the held pair (`366093311e2`, `f8955682e6d`) and at `28bb64893ed`, the unit suites pass: 1234, 1250 and 1280 tests.
- ruff, black and isort are clean on `test_review.py`.
