# Thermo-nuclear review (round 2)

Acted on: flattened `InputReferences.resolve` runtime-key logic (extracted `_is_other_legacy_alias`, no leaked loop var, one-line comment) and trimmed multi-line comments/docstrings in `output_collect.py`, `output_references.py`, `tools/__init__.py` (`bc6d953af2c`). Not acted on: linter's format_source selector branch, `_warn_unqualified` optional param, `tools/__init__.py` size, and the scoped-out decisions.

## Not acted on

- **Linter keeps its own format_source selector error before `output_reference_problem`.** Duplicates the selector check, but it preserves the pre-existing dev message (`selects an element with format_source=... but 'input1' is not a collection input`, pinned by a dev test). Folding it in changes user-facing lint text.
- **`_warn_unqualified(qualified_key=None)` optional param.** `structured_like` caller has no resolver result; making it required would push `ResolvedReference` into that unrelated path. Low value.
- **`tools/__init__.py` at 5149 lines.** Already far past 1k on dev; branch adds ~47 net lines in a cohesive method. Decomposing `Tool` is out of scope.
- **26.2 load error for shadowed legacy alias, `any()` vs `all()`, YAML linting.** John's decisions.

<details>
<summary>Full review</summary>

Verdict: structurally sound. Round 1 already did the big judo move - one `InputReferences` walker over `ToolSource` shared by linter and tool loading, replacing the `tools/parameters` regex-based `qualify_legacy_data_input_reference` (net -50 lines there) and the linter-private XML walker. The metadata_source generalization reuses it via `_lint_output_references(attribute)` and `OUTPUT_REFERENCE_PARAM_TYPES`, so a new attribute is a dict entry, not new branches. No file crosses 1k due to the branch (`linters/output.py` 457, `output_references.py` ~180).

Findings:

1. `resolve()` - `runtime_key` logic nested `if` relying on `qualified` bound in an earlier `if` block, with a 4-line comment. Fixed: compute inside the single-match branch, extract `_is_other_legacy_alias`.
2. Multi-line comments/docstrings violate one-line style (`output_collect.py`, `InputReferences` docstring, `_resolve_output_references` docstring). Fixed.
3. Linter `_check_output_reference` special-cases format_source selector before `output_reference_problem`, which checks the same thing. Kept for message compatibility (see above).
4. `split_element_selector` returns selector with brackets; `output_format.py` strips them with `selector[1:-1]`. Slightly leaky shape but simple; fine.
5. `_resolve_output_references` builds `type_sources` and `references` lists up front to skip building `InputReferences` when unneeded - reasonable; avoids a parse per tool load.
6. `_warn_unqualified` gained optional `qualified_key`; acceptable (see above).

Tests: `test/unit/tool_util/test_output_references.py`, `test/unit/app/tools/test_output_references.py`, `test_tool_linters.py`, `test_tool_deserialization.py` - 190 passed. ruff/black clean.

</details>
