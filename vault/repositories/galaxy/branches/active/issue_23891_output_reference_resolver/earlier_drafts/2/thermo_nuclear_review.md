Acted on 2 structural findings (tool-load resolver built once; flattened `_visit` control flow) in `e52f77f32dc`; left 3 findings alone (2 out of scope, 1 nit kept for message specificity).

## Not acted on

- **Linter keeps its own selector-on-non-collection error ahead of `output_reference_problem`.** The shared helper covers the case, but the linter message names the path and is pinned by `test_tool_linters.py`. Low value to change.
- **Shadowed legacy alias as a 26.2 load error.** Left for John per scope constraint.
- **`all()` vs `any()` for mixed-type matches in `output_reference_problem`.** Left for John per scope constraint.

<details>
<summary>Full review</summary>

Verdict: no structural regressions. The branch is a net code-judo win: it deletes the regex-based `qualify_legacy_data_input_reference` in `tools/parameters` and the XML-walking `_InputReferences` in the linter, replacing both with one `ToolSource`-driven resolver in `tool_util/parser/output_references.py` shared by linter, tool load and `output_format.py` (selector regex now defined once). No file crosses 1k lines (`tools/__init__.py` was already 5k+; growth ~45 lines in one cohesive method). `output_collect.py` change moves the collector default loop out of the `format_source` branch rather than adding a new branch - fine.

Findings:

1. (Fixed) `Tool._resolve_output_references` built `InputReferences` lazily with two repeated `if input_references is None` guards across two loops. Restructured: collect type_sources and (output, attribute, reference) triples first, return early if none, build resolver once.
2. (Fixed) `InputReferences._visit` used an `elif ... or (name := ...) is None: continue` inside the dispatch chain - clever and hard to scan. Split into param early-continue, name guard, then plain type dispatch.
3. (Nit, kept) Linter duplicates the selector check before delegating to `output_reference_problem`.
4. `ResolvedReference.runtime_key` logic (shadow-avoidance) is the densest part of the module; comment is adequate, behavior is pinned by unit tests. No change.
5. `_warn_unqualified` gained an optional `qualified_key` param - mild optionality, but only one caller passes it and it carries real repeat-index info. Acceptable.

Validation: `test/unit/app/tools/test_output_references.py`, `test/unit/tool_util/test_output_references.py`, `test/unit/tool_util/test_tool_linters.py`, `test/unit/app/tools/test_tool_deserialization.py` - 189 passed. ruff/black clean; mypy error count on touched files unchanged vs pre-change.

</details>
