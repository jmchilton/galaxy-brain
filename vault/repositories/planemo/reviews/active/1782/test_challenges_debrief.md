# Test challenges debrief: planemo#1782

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `2ffe63c3c57f39bf649ec4ac29b3ec1c334c20c7`
- Mode: REVIEW_DIRECTORY. The PR was not edited; every drop, rewrite or addition below is a recommendation.

## What was run

Run from the PR worktree, using the `shed_install_timeout` worktree's venv (`PYTHONPATH=.` so the PR's `planemo` package was the one imported):

- `pytest tests/test_planemo_linters.py -k security`: 49 passed.
- `pytest tests/test_lint.py -k security`: 1 passed.
- Coverage of `planemo/linters/security.py` from the unit tests: 91% (587 statements, 50 missed). Missed lines: 41-42, 180, 189, 198, 206-207, 382-383, 436-437, 483, 497, 515, 533-541, 568, 580, 586-594, 607, 616-619, 630, 656-657, 675, 694-695, 711-715, 722, 728, 756, 853, 855, 924.
- Manual CLI checks with scratch tools (not committed):
  - `planemo lint --security -s SecurityRawIdentifier` drops only that class's finding, as described.
  - `planemo shed_lint --help` lists `--security`.
  - A tool that pulls its command from a `@TOKEN@` and its inputs from `<expand macro>` is reported correctly, and so is a `#unless` condition.
  - Params nested in `conditional/when` and `section` are reported under their dotted names.

All of these behave as described. Several of them have no test (see the test plan).

## Overall shape

The tests are mostly the right kind. Nearly every security test lints a real tool (a fixture XML or an inline template written to `tmp_path`) through `lint_tool_source_with_modules` and asserts the exact `(level, message, linter)` list, so they pin behavior rather than implementation. There are no mocks or `SimpleNamespace` constructs, so the challenges about mocks, no-op implementations and dataclasses do not apply. The CLI test in `tests/test_lint.py` covers the real wiring: the flag, the exit code with INFO findings, plain lint staying silent, and the module skip.

The problems are about shape and coverage, not test kind:

1. One test reaches into private helpers.
2. About 35 tests repeat the same template and the same full message strings, so they are long to read and expensive to change when a message is reworded.
3. Several behaviors the PR description advertises have no test.

## Test-by-test challenges

### Drop: `test_security_loop_bindings_persist_after_their_loop`

This test calls `security._loop_bindings` and `security._loops_at` directly and asserts the binding dict at hand-picked offsets. That tests the implementation. The same semantics are already pinned at the behavior level by `test_security_linter_keeps_loop_variable_bound_after_its_loop` (the cases after the loop, after another variable's loop, rebound by a later loop, and an inner loop shadowing an outer one) and by `test_security_linter_resolves_loop_variables_only_where_bound` (a reference before the loop). Changing the scope representation would break this test without any change in behavior. Drop it. If the "## end for comment" case matters, add it as a row to the behavior-level table instead.

### Drop or replace: `test_security_linter_can_be_skipped_by_module_name`

This duplicates the module-skip part of `test_lint_security`, which is the better test because it goes through the real `--skip` handling in `build_lint_args`, where `"security"` was added to the known-skip list. Drop the unit test and extend the CLI test with the per-class skip (see below), which is advertised but untested.

### Rewrite: the inline-template tests into one table

`test_security_linter_ignores_if_conditions_but_not_bodies` through `test_security_linter_accepts_unquoted_shlex_quote` (and the `_lint_loop_tool` cases) all follow one pattern: a command string, an inputs string, and an expected message list. The expected messages are written out in full each time. For example, the `SecurityUnquotedParam` message ("Value of text param 'txt' is interpolated unquoted ... restrict the valid characters") appears about 15 times, and the `SecurityRawIdentifier` message with its `re.sub(r'[^\w.-]', '_', ...)` hint about 7 times. Recommended rewrite:

```python
def _unquoted(name):
    return ("info", f"Value of text param '{name}' is interpolated unquoted in the command; default "
            "sanitization still allows spaces, quote it or restrict the valid characters", "SecurityUnquotedParam")

def _raw_identifier(name): ...
def _raw_name(name): ...

COLL = '<param name="coll" type="data_collection" collection_type="list"/>'
TXT = '<param name="txt" type="text"/>'

@pytest.mark.parametrize("command,inputs,expected", [
    pytest.param("#if $coll.name:\ntool --opt $txt;\n#end if", COLL + TXT, [_unquoted("txt")], id="if-condition-is-inert"),
    pytest.param("tool --opt $( shlex.quote($coll.element_identifier) )", COLL, [], id="unquoted-shlex-quote-cleans"),
    ...
])
def test_security_linter_command_scanning(tmp_path, command, inputs, expected):
    assert _lint_template_tool(tmp_path, command, inputs) == expected
```

Keep each case's explanatory comment as a comment above its `pytest.param` row. This keeps every behavior case and its exact-message assertion. It removes most of the roughly 600 lines of repetition, and a message rewording becomes a one-line change. Merge `_lint_loop_tool` into `_lint_template_tool`: the loop tool's inputs are just another `inputs` constant (`COLL + REP`). `test_security_linter_binds_enumerate_variables` also duplicates the first half of the `enumerate-loop-then-repeat-loop` case and can become one row.

The two-part tests (`..._cheetah_comments_inside_quotes_do_not_flip_quote_state`, `..._midword_cheetah_comment_silences_its_line`) each hold two independent cases and should become two rows each.

### Keep: fixture-file tests

`test_security_linter_flags_raw_identifier`, `..._flags_disabled_sanitization`, `..._flags_column_and_tag_values`, `..._flags_unquoted_text` and `..._stays_quiet_on_clean_tool` are good full-tool behavior tests. Keep them. Strengthen the clean fixture as described below.

### Keep: `tests/test_lint.py::test_lint_security`

This is the right integration test. Extend it rather than adding more unit tests for wiring.

## Test plan (missing coverage)

Each item below is one table row or one CLI assertion. All were checked to behave correctly today, so these are regression pins, not bug reports.

1. **Macros.** The description calls the linter "macro-aware", but no test uses `<macros>`, `<token>` or `<expand>`. Add a fixture with a `macros.xml` import that supplies a command token holding `'$coll.element_identifier'` and an `<xml>` macro supplying the inputs. Assert the `SecurityRawIdentifier` finding. (`tests/data/tools/` already has macro fixtures to copy the layout from.)
2. **The other condition directives.** Only `#if` is tested. Add rows for `#elif`, `#while` and `#unless` conditions holding `$coll.name`, each with a body holding an unquoted `$txt`.
3. **Nested params.** No test has a `conditional`/`when` or `section` param (lines 189, 198 and 206-207 are uncovered), though `$cond.param` is the most common real-world shape. Add one row with an unquoted `$cond.txt` inside a `when`, and one with `$sec.other`.
4. **Sanitizer modelling.** The description says the module models "`string.*` constants, `default`/`none` presets, `<valid>` add/remove, `<mapping>` add/remove". Uncovered today:
   - `<valid>` `<remove>` (694-695), e.g. `initial="string.printable"` minus `preset="string.punctuation"`, which should be quiet.
   - Mapping preset add/remove (711-715).
   - The `letters`/`lowercase`/`uppercase` aliases.
   - A comma-separated `initial`.
   - An unknown `string.` name (675).
5. **Validator and `re.sub` class edge cases.**
   - A range that admits metacharacters, such as `^[!-~]+$` (568/580).
   - A `negate="true"` regex validator (756).
   - A positive `[\W]` `re.sub` class (616-619).
   - A replacement string holding a metacharacter.
   - Escaped quotes in the `re.sub` literal (533-541).
6. **CLI per-class skip.** In `test_lint_security`, add `-s SecurityRawIdentifier` and assert that `SecurityRawIdentifier` is absent and `SecurityRawCollectionName` is still present.
7. **`shed_lint --security`.** The flag was added to the shared option group, so `shed_lint` exposes it, but nothing runs it. One `shed_lint --security --tools` call over a small repo fixture holding a security fixture tool would pin the wiring.
8. **Clean fixture breadth.** `security_clean_tool.xml` is described as using "restricted sanitizers", but it has no `<sanitizer>`, no regex validator and no `shlex.quote`. Add a text param with a restrictive `<sanitizer><valid initial="string.ascii_letters"/></sanitizer>` used unquoted, a text param with `^[\w.-]+$` used unquoted, and an unquoted `$( shlex.quote(...) )`. The one "stays quiet" test then pins every advertised false-positive mitigation together.

## Design notes that would simplify the tests

- `DEFAULT_VALID_CHARS` re-types `galaxy.util.valid_chars`. I checked that the two sets are equal today. The module already imports `mapped_chars` from `galaxy.util`, so importing `valid_chars` too removes a drift point that would otherwise need its own parity test.
- The eight `Linter` subclasses route findings by string keys (`"raw_identifier"`, `"raw_collection_keys"`, `"dangerous_invalid_char"`, ...) that are matched by hand in each `lint` body. A typo in any key silently drops that class's findings. Only the exact-message tests catch that, and only for keys a test happens to hit. Use a small base class with a `keys: ClassVar[Tuple[str, ...]]` attribute and one shared `lint`, with the keys typed as a `Literal`, or have `emit` take the class itself. The routing then becomes structural, and mypy checks it instead of tests.

## Comments in tests

- `test_security_linter_cheetah_comments_inside_quotes_do_not_flip_quote_state` contains `# P1: the ## comment's apostrophe ...`, a leftover marker from the AI review log. Drop the `P1:` prefix.
- `test_security_linter_accepts_word_class_validator_with_dots` says "(see the backslash-s case above)", but `test_security_linter_flags_validator_with_whitespace_escape` comes after it. The table rewrite fixes this naturally.
