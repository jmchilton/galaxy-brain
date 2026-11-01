Run via claude-opus-5-5 at low effort.

# Thermo-nuclear code quality review: issue_24350_has_line_matching_docs_26_1

**Top line:** I found no structural regressions. The one change I made was renaming the `Expression` alias in `asserts/text.py` to `TextExpression`. It now matches its new sibling `LineExpression` and the `ElementExpression`/`AttributeExpression` naming in `asserts/xml.py`. Codegen ignores alias names, so the generated artifacts don't change. I confirmed this by rerunning `codegen.py`, which left no diff. The change is committed as `39efe232c41 fixup! Document that has_line_matching ...` and pushed. The test file passes 127/127, and ruff is clean. I did not act on the other findings below: the code-judo fix to the regex wrap, the duplicated description and docstring, and the plain-`str` regex type.

## Not acted on

- **Code-judo move: fix the wrap instead of documenting it.** About half of the new `has_line_matching` prose explains a quirk: the alternation is ungrouped and the match can span lines. Changing the wrap to `^(?:{e})$` would make the alternation caveat unnecessary. It is still a behavior change, though: it changes the counts for existing tests that use `|`, and the issue asked for docs only. That decision belongs to scope review, not this branch. I'm noting it as the structurally better long-term fix.
- **The parameter descriptions and docstrings repeat each other.** The `has_text_matching` docstring paragraph repeats the `TextExpression` description almost word for word. `LineExpression` also repeats the core of the `has_line_matching` docstring. Both texts appear on the generated docs page, because the docstring is followed by `$attribute_list`. I kept them, because each is also shown on its own: element hover versus attribute hover in IDEs and the XSD. Trimming them would also mean another 6-minute regeneration for a small gain.
- **`TextExpression`/`LineExpression` are plain `str`.** The xml expressions use `XmlRegex` with `validators=["check_regex"]`. The text ones were never validated, and adding validation changes behavior, so it is out of scope for a docs backport.
- **`test_asserts.py` is already over 1k lines (1375).** It was already over the threshold before this branch, which adds 38 lines of parametrized tests in the existing style. No action.
- **Test comment nit.** "grouped alternatives stay anchored at both ends" is placed on a case that doesn't contrast grouped with ungrouped. The next two cases make that contrast, so the comment is acceptable.

## Details

- Source change: two module-level `Annotated` aliases, one swapped parameter annotation and two longer docstrings. No new conditionals, wrappers, casts or branching, and the change is in the right layer: the docs are generated from the assertion functions, as designed.
- Generated artifacts (`galaxy.xsd`, `tool_util_models/assertions.py`, `schema.ts`, `ToolSourceSchema.json`) are mechanical outputs of `text.py`. Reviewed for consistency only.
- Tests pin behavior with one shared fixture and two parametrized tests. That is direct and readable, with no helper sprawl.
- `.venv/bin/mypy` on `text.py` reports 5 errors, all already present in `verify/test_data.py` and `verify/__init__.py`, none in `text.py`.
