Run via Claude Opus 5.5 at low effort.

**Acted on (coordinator):** Low 1: added the ungrouped `("I\t|II\t", 2)` case to the baseline parametrize, folded into the baseline commit. Low 2: added the `(?m)` clause to the `has_text_matching` parameter text and docstring. Nit 3: the alternation example now uses `\t`. All artifacts were regenerated.

**Not acted on:**
- Low 3 (XML-path test case): the existing `run_assertions` `has_line_matching` tests already cover XML parsing. The new tests pin regex semantics, and direct calls read more clearly for that.
- Nit 1 (`$` before a trailing newline) and Nit 2 (multiline regex vs. per-line split): the reviewer agreed the current wording is the right model for docs.

# Normal review: issue_24350_has_line_matching_docs_26_1

**Top line:** No blockers and no medium findings. Doc claims are accurate in substance, generated artifacts are complete and consistent, and the tests pass (125 passed). There are 3 low findings: one untested doc claim, one optional `(?m)` tip, and the test style differs from the rest of the file. There are 3 nits about precision of wording.

## Findings

- **Low 1. Ungrouped alternation is documented but not pinned.** The docstring says the wrap "does not group the expression" (`chr1|chr2 .*`), and the proposal's own repro (`foo|xbar` counting `foo 1`) shows the leak. The baseline tests only cover the grouped form. Add a case such as `("I\t|II\t", 2)` to the `has_line_matching` parametrize. It counts 2 because `^I\t` stays a prefix match with no `$`. That pins the half-anchored behavior the docs warn about.
- **Low 2. Optional `(?m)` tip for has_text_matching.** The docs say `^`/`$` match only at output start and end. Users who want line anchors in `has_text_matching` can use an inline `(?m)` flag, for example `(?m)^I\t` counts 2. One clause would turn a limitation into a workaround: "unless multiline mode is enabled with ``(?m)``". This is optional, and the strict claim is still true without the flag.
- **Low 3. Test style.** The new tests call `asserts.text.assert_has_*` directly. Every other test in `test_asserts.py` goes through `run_assertions(<xml>, data)`. Direct calls are fine for pinning regex semantics and read clearly. However, they bypass XML attribute parsing, and they use literal tab characters where tool authors write `\t` in XML. Either keep them, which is acceptable, or add one XML-path case (`<has_line_matching expression="I\t.*" n="2"/>`) so the documented example form is exercised end to end. Placement, right after the existing `has_line_matching` tests, is good.
- **Nit 1. `$` before a trailing newline.** "`$` match only at ... the end of the whole output" is slightly imprecise. Python `$` without MULTILINE also matches just before a final `\n`: `re.findall("b$", "a\nb\n")` returns `['b']`. For typical newline-terminated outputs, this is what a user means by "end of the output", so the wording is not misleading in practice. Leave it, or say "end of the output (before a final newline)".
- **Nit 2. "checked ... against each line".** The implementation runs one MULTILINE regex over the whole output and counts non-overlapping matches. It does not split into lines. Patterns that can consume `\n` (`\s`, `[^x]`, explicit `\n`) can match across lines: `^a\sb$` matches `"a\nb"`. The edge case is rare, and the line-oriented wording is the right mental model for docs. No change is needed.
- **Nit 3. Example separator.** `(?:chr1|chr2) .*` uses a space, but chr-keyed formats are tab-delimited. `\t` would be more realistic. This is cosmetic.

## Verified OK

- **Code claims:** `has_line_matching` wraps the expression as `^{e}$` with `re.MULTILINE` for both search and findall. `has_text_matching` uses plain `re.search`/`re.findall` with no flags. "`chr1` and `^chr1` only match a line that is exactly `chr1`" is correct, because `^^chr1$` is equivalent to `^chr1$`.
- **Rendering:** I ran `doc/parse_gx_xsd.py` against the branch XSD. Both elements render as clean GFM/MyST paragraphs with inline code and a fenced `xml` block, which matches the `archive.py`/`hdf5.py`/`json.py` convention. Double-backtick inline code is already widely used in asserts parameter docs (`_types.py`, `image.py`). The pipe in `(?:a|b)` inside the attribute table is escaped by `parse_gx_xsd.py` (`|` becomes `\|`). This follows the same precedent as the existing `(k|M|G|T|P|E)i?` cells.
- **Missing artifacts:** none. A grep for the old string "The regular expressions to attempt match in the output" finds no remaining hits in the worktree. The new text is present in galaxy.xsd, tool_util_models/assertions.py, schema.ts and ToolSourceSchema.json.
- **Codegen consistency:** I regenerated `assertions.py` via `codegen.main()` with the XSD step stubbed out, and it produced no diff. The XSD step needs `xmllint`, which is not installed in this environment. The committed XSD hunks are surgical and match the docstrings. My checkout was left clean.
- **Tests:** `pytest -q -p no:postgresql test/unit/tool_util/verify/test_asserts.py` gives 125 passed. The tests are meaningful because they distinguish prefix, anchored and grouped forms, and the `II\t` overlap for `has_text_matching`.
- The `Expression`/`LineExpression` split is minimal, and `Expression` is still used only by `has_text_matching`.

<details><summary>details</summary>

Probe results (Python 3.12 `re`):

```
text $ before trailing nl: re.findall("b$", "a\nb\n") -> ['b']; (?m)^b -> ['b']
ungrouped alt on GFF: len(findall("^I\t|II\t$", gff, M)) -> 2
cross-line \s: findall("^a\sb$", "a\nb\n", M) -> ['a\nb']
CRLF: findall("^b$", "a\r\nb\r\n", M) -> []   (pre-existing; trailing .* absorbs \r)
```

Rendered `has_line_matching` docs (schema.md, from parse_gx_xsd.py) show the expanded paragraph, a fenced `xml` block with `<has_line_matching expression="chr1.*" n="2"/>`, and then the Attributes table. The assertion appears 4 times because the assertion group is rendered under several parents, which is pre-existing behavior.

Process note: running `PYTHONPATH=lib python lib/galaxy/tool_util/verify/codegen.py` without `xmllint` on PATH leaves a large unformatted rewrite of galaxy.xsd and stops before the models step. I reverted it. Whoever regenerates this file needs `xmllint` (libxml2-utils).

</details>
