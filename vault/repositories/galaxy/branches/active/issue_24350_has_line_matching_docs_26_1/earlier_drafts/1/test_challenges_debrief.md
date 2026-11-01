Run via Claude Opus 5.5 at low effort.

# Test challenges debrief: issue_24350_has_line_matching_docs_26_1

The two baseline tests stay. I strengthened the ungrouped-alternation pin with one more case, which was committed as `fixup!` `d686e7a4bf5` against the baseline commit `f12e7955aec` and pushed.

## Tests challenged

`test/unit/tool_util/verify/test_asserts.py`:

- `test_has_line_matching_anchors_expression_to_whole_line`, parametrized: **kept and strengthened.**
  - It pins user-visible semantics (which lines count), not internals. The docstrings now document exactly this behavior, so the test guards the documented contract.
  - The comment said "^ binds only to the first alternative and $ only to the last", but `I\t|II\t` (count 2) only showed the first half. I added `I\t|\t5` with a count of 3. Here `\t5$` matches the end of the `II` line, which a grouped `^(?:I\t|\t5)$` would not.
- `test_has_text_matching_searches_whole_output`, parametrized: **kept.** It pins the unanchored search and the `^` that anchors to the whole output, which the new `Expression` description claims.

## Checklist

- Not silly and not implementation-mirroring: each case is an expression a tool author would write, with an observable count.
- No mocks, fakes or layout.
- The cases call `asserts.text.assert_has_*` directly instead of going through the XML `run_assertions` path that neighbouring tests use. That is fine because the semantics under test live in these functions. The existing XML tests already cover the parsing path.
- API/integration/framework layer: a framework tool test could express this, but it would be slower and add nothing. The unit layer is right. No existing higher-layer test covers the anchoring.
- E2E: not applicable, because this is a docs and schema-description change with no UI behavior.
- No dedicated test-infra file, so nothing to drop.

## Baseline verification

- Branch: `pytest -q -p no:postgresql test/unit/tool_util/verify/test_asserts.py` gives 127 passed.
- Base behavior: I temporarily checked out `text.py`, `assertions.py` and `galaxy.xsd` from `origin/release_26.1`, then restored them from HEAD. All 9 parametrized cases passed. The baseline tests hold on the base branch, as required.
- `ruff` and `black --check` are clean.
- The branch has no non-baseline tests, which suits a docs-only change. The regenerated artifacts are kept in sync by the existing codegen and lint checks, not by new tests.
