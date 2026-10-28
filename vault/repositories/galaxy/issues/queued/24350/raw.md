# Assertion docs: `has_line_matching` is anchored but documented like `has_text_matching`

Source: wf_foundry, foundry#657 (https://github.com/galaxyproject/foundry/issues/657), found on an
nf-core/rnaseq → Galaxy conversion run. Foundry fixed its own note in branch `issue-657-assert-semantics`
(`planemo-asserts-idioms`), but the confusion comes from Galaxy's own docs, which every downstream
schema (tests-format JSON schema, galaxy.xsd, pydantic assertion models) inherits.

## Problem

`lib/galaxy/tool_util/verify/asserts/text.py` (dev):

- `assert_has_text_matching` (~:137) → `re.search(e, o)` / `re.findall(e, o)`: **unanchored**.
- `assert_has_line_matching` (~:165) → `re.search(f"^{e}$", o, flags=re.MULTILINE)` /
  `re.findall(f"^{e}$", ...)`: **wrapped as `^expr$`, must match a whole line**.

But both share one parameter annotation, `text.py:21`:

```python
Expression = Annotated[str, AssertionParameter("The regular expressions to attempt match in the output.")]
```

and the `has_line_matching` docstring says only "contains a line matching the regular expression".
Codegen (`lib/galaxy/tool_util/verify/codegen.py`, `rewrite_galaxy_xsd` / `write_assertion_models`)
copies that into `galaxy.xsd` (~2622 and ~2744, identical text) and
`lib/galaxy/tool_util_models/assertions.py` (`has_line_matching_expression_description` :217,
`has_text_matching_expression_description` :647, identical). So two families with identical docs behave
oppositely on the same regex.

Concrete failure: `expression: "^I\t"` with `n: 599` on a GFF with 599 seqname-`I` lines. It becomes
`^^I\t$`, counts 0, and the test fails with "expected 599 lines matching, found 0", which reads like a
broken output, not a broken assertion. You need `I\t.*`. Verified against galaxy-tool-util 26.1.1
functions directly (`^I\t` → 0, `I\t.*` → match).

Smaller, same theme: `assert_has_n_columns` (`asserts/tabular.py`) docstring does say "tests only the
first line" / "first non-comment line". It could add that when header and data rows differ in width
(R `write.table(row.names=TRUE, col.names=TRUE)` gives an N-field header over N+1-field rows) it measures
the header. Optional.

## Proposal

Docs-only PR against dev (or release branch if wanted):

1. Split the shared annotation: give `has_line_matching` its own expression parameter text, e.g. "Regular
   expression that must match an entire line; Galaxy anchors it as `^expression$` per line (multiline),
   so use `.*` to match a prefix." Keep `has_text_matching` as unanchored search ("matched anywhere in
   the output; not anchored").
2. Extend the `assert_has_line_matching` docstring the same way, with a one-line example (`foo.*` vs `foo`).
3. Optionally add the header-width note to `assert_has_n_columns`.
4. Re-run codegen to regenerate `galaxy.xsd` and `tool_util_models/assertions.py`; check that the client
   API schema or anything else derived from them is regenerated if it carries the descriptions.

No behaviour change. Downstream: gxwf/galaxy-tool-util JSON schema (tests-format) picks it up on next
vendoring; Foundry re-vendors.
