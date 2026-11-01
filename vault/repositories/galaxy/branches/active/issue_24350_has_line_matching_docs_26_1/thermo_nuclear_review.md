Run via claude-opus-5-5 at low effort.

# Thermo-nuclear code quality review (re-harden): issue_24350_has_line_matching_docs_26_1 @ c566eeb1d53

**Top line:** Nothing to act on. I found no structural regression, no spaghetti growth and no file crossing 1k lines. No code-judo move is worth making on a `release_26.1` fix. The only behavior change is one regex wrapper, `^{e}$` becoming `^(?:{e})$`, kept in the existing `_assert_presence_number` shape. Everything else is docstrings and `AssertionParameter` descriptions, the single source that codegen fans out to the XSD, the pydantic models, the client schema and `ToolSourceSchema.json`. Three candidate refactors were considered and rejected, listed below. I made no commits and did not regenerate anything.

**Verification:** `test_asserts.py` passes (128 tests). Rerunning `codegen.py` left the tree clean, so `galaxy.xsd` and `assertions.py` match their sources. I did not rerun the client schema and `rebuild.py` steps, because no source changed.

## Not acted on

- **Duplicated anchored pattern in `assert_has_line_matching`.** The presence and count lambdas each build `f"^(?:{e})$"` with `re.MULTILINE`. I could hoist it into a local `line_pattern`, but then both lambdas would ignore their `e` argument and stop mirroring `assert_has_line` and `assert_has_text_matching`, which have the same two-lambda shape. `re` caches compiled patterns, so there is no performance gain. The duplication predates this branch; the diff only edits it in place.
- **Code-judo: implement `has_line` as `has_line_matching(re.escape(line))`.** `assert_has_line` is the same anchored multiline search with an escaped literal. Merging them would delete one copy of the lambdas, but it would change `has_line`'s error messages and touch an assertion that this bug fix does not cover. It is a reasonable `dev` cleanup, but not for a 26.1 fix.
- **Anchoring is explained twice for `has_line_matching`**, once in the `LineExpression` description and once in the docstring. Codegen places them on different surfaces: the attribute documentation and the element documentation. The attribute text is one sentence and the docstring gives the worked example, which is the convention in the other assertions. I'm keeping both.
- **`$` also matches before a trailing newline** in the `TextExpression`, `ElementExpression` and `AttributeExpression` wording. This is standard Python `re` behavior. Codex and the earlier normal review already raised it and declined it.
- **The pre-existing `has_n_columns` docstring renders `\t` as a literal tab in the XSD**, because the docstring is not raw. This predates the branch, and the branch only removed a stray backtick on that line. It is out of scope.

## Details

- **Size:** `text.py` 204 lines, `xml.py` 298, `tabular.py` 76. `test_asserts.py` was already over 1k lines at the base (+36 here), so the branch pushes no file past the 1k-line threshold.
- **Types and boundary:** Splitting `Expression` into `TextExpression` and `LineExpression` is the right ownership: each assertion's parameter description now states its own matching semantics instead of sharing a misleading one. `Expression` has no remaining importers. The generated field titles stay "Expression" because they come from the parameter name, so the client contract is unchanged apart from description strings.
- **XML descriptions:** `ElementExpression` and `AttributeExpression` say "not anchored (as in `has_text_matching`)". This is accurate: `assert_element_text_matches` and `assert_attribute_matches` delegate to a `has_text_matching` sub-assertion.
- **Tests:** Two parametrized tests use a shared fixture string to pin line-anchored versus whole-output semantics, including the alternation cases that the grouping fix flips. They are direct and readable, with no new helpers.
- **Docstring claims checked:** `chr1` and `^chr1` match only an exact `chr1` line. A newline-capable class such as `\s` can make a match span lines under `^(?:...)$` with `MULTILINE`. A header that is narrower than the data rows is the one counted unless it is a comment line, because `get_first_line` skips comment lines. All three claims are true.
