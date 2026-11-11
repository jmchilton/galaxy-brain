# Test challenges review: planemo#1782

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `2ffe63c3c57f39bf649ec4ac29b3ec1c334c20c7`
- Details and the full test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

The security tests are mostly the right kind: they lint full tools, either fixtures or inline templates, and assert exact messages. There are no mocks. The CLI test covers the flag, the exit code with INFO findings, and the module skip. 49 unit tests and 1 CLI test pass locally, and unit-test coverage of `planemo/linters/security.py` is 91%. The findings below are about shape and gaps, not test kind.

## P2 1: Collapse the ~35 repeated inline-template tests into one parametrized table with message builders

`tests/test_planemo_linters.py` adds about 850 lines. Most of them are one pattern repeated: a command, an inputs string, and a fully spelled-out expected message. The `SecurityUnquotedParam` message is written out about 15 times and the `SecurityRawIdentifier` message about 7 times. Rewording any message means editing a dozen tests, and the repetition hides what each case actually varies.

Suggested fix:

- Add small message builders (`_unquoted(name)`, `_raw_identifier(name)`, `_raw_name(name)`) and shared input constants (`COLL`, `TXT`, `REP`).
- Make one `@pytest.mark.parametrize("command,inputs,expected", ...)` test. Each existing case becomes a `pytest.param(..., id=...)` row, with its explanatory comment kept above the row.
- Merge `_lint_loop_tool` into `_lint_template_tool`.
- Split the two-part tests (`..._cheetah_comments_inside_quotes_do_not_flip_quote_state`, `..._midword_cheetah_comment_silences_its_line`) into separate rows.

Every behavior case and its exact-message assertion is kept.

## P2 2: Advertised behaviors have no test (macros, other condition directives, nested params, sanitizer add/remove)

The PR description lists these, but no test exercises them. All of them work today; I checked them manually with scratch tools.

- **Macros.** The description calls the linter "macro-aware", but no test uses `<macros>`, `<token>` or `<expand>`.
- **Condition directives.** Only `#if` is tested. `#elif`, `#while` and `#unless` are not.
- **Nested params.** Params inside `conditional/when` and `section` are untested; `_index_params` lines 189, 198 and 206-207 are uncovered. This is the most common real-world parameter shape.
- **Sanitizer modelling.** The description claims alignment with Galaxy's `ToolParameterSanitizer`, but `<valid>` `<remove>`, mapping preset add/remove, the `letters`/`lowercase`/`uppercase` aliases and comma-separated `initial` values are untested.
- **Validator and `re.sub` edge cases.** Character ranges that admit metacharacters, `negate="true"` validators, positive `[\W]` `re.sub` classes, and escaped quotes in `re.sub` literals are untested.

Suggested fix: add one fixture with an imported `macros.xml` (a token holding the command, an `<xml>` macro holding the inputs), and add the other cases as rows in the P2 1 table. The debrief lists a concrete row for each.

## P3 1: Drop the private-helper test `test_security_loop_bindings_persist_after_their_loop`

This test calls `security._loop_bindings` and `security._loops_at` directly and asserts binding dicts at hand-picked offsets. The same semantics are already pinned through the linter by `..._keeps_loop_variable_bound_after_its_loop` and `..._resolves_loop_variables_only_where_bound`, so the test only couples the suite to the scope representation. Drop it, and move the `## end for comment` case into the behavior table if it is wanted.

## P3 2: Move skip coverage to the CLI test, and cover the per-class skip and `shed_lint --security`

`test_security_linter_can_be_skipped_by_module_name` duplicates the module skip already checked by `test_lint.py::test_lint_security`, which goes through the real `--skip` validation in `build_lint_args`. The per-class skip (`--skip SecurityRawIdentifier`) and `planemo shed_lint --security` are both advertised, but neither is tested. I verified manually that both work.

Suggested fix: drop the unit test. In `test_lint_security`, add `-s SecurityRawIdentifier` and assert that `SecurityRawIdentifier` is absent and `SecurityRawCollectionName` is still present. Add one `shed_lint --security` invocation over a small repository fixture.

## P3 3: The clean fixture doesn't cover the mitigations the PR claims it does

The description says `security_clean_tool.xml` "uses cleaned identifiers, quoted interpolation, and restricted sanitizers". It has no `<sanitizer>`, no regex validator and no `shlex.quote`.

Suggested fix: add three unquoted interpolations to the fixture:

- a text param with a restrictive sanitizer (`<valid initial="string.ascii_letters"/>`)
- a text param with a `^[\w.-]+$` validator
- a `$( shlex.quote(...) )` call

The one "stays quiet" test then pins every advertised false-positive mitigation together.

## P3 4: Reuse `galaxy.util.valid_chars` instead of re-typing it as `DEFAULT_VALID_CHARS`

`planemo/linters/security.py` imports `mapped_chars` from `galaxy.util`, but it copies the default valid set by hand. The two sets are equal today, but the copy is a drift point that would otherwise need a parity test. Import `valid_chars` alongside `mapped_chars` and build the preset from it.

## P3 5: Make the finding-to-class routing structural rather than stringly typed

The eight `Linter` subclasses each filter `_security_checks` by hand-matched string keys (`"raw_identifier"`, `"raw_collection_keys"`, `"dangerous_invalid_char"`, ...). A typo in any key silently drops that class's findings, and only exact-message tests that happen to hit the key would notice.

Suggested fix (optional): give the classes a small shared base with a `keys` class attribute and one `lint` implementation, typing the keys as a `Literal`. Alternatively, have `emit` take the linter class itself. mypy then checks the routing instead of tests.

## P3 6: Incorrect or leftover comments in tests

- `test_security_linter_cheetah_comments_inside_quotes_do_not_flip_quote_state` carries a `# P1:` prefix left over from the AI review log.
- `test_security_linter_accepts_word_class_validator_with_dots` points to "the backslash-s case above", but that test comes after it.
