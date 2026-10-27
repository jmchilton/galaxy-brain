# Rescope review (5e34a3f6f2b)

Acted on: split the 3 pre-existing advisor fixes into their own commits, each with a red-to-green test. Replaced the XML copy of AbstractTool's tool-provided-metadata opt-in with a shared `output_uses_tool_provided_metadata` helper. Kept the skip `<=` change. Found no other real bugs.

Commits (on fd124f4219e): bc791f9d427 21.09 code, 92aee5eaabc skip `<=`, 7be0b105400 `_find_all` xpath, 73af3361b18 26.1/26.2 + helper. Not pushed.

Not acted on:
- Bare `structured_like="input1"` nested two conditionals deep gets no 26.0 advice (found while writing the skip test). Not in scope. It may mean legacy lookup never resolved that case. Worth a check later.
- `use_latest_profile` still hardcodes "26.1" in case.py. That is right for now (the latest test-case semantics change is 26.1), but it is a constant that will go stale.
- The `_find_all` test calls private helpers directly. The bug was latent until 26.x callers existed, so no public path could show it alone.
- The `galaxy.json` detection is a heuristic (a text search of command/configfiles). That is fine for `consider`/niche advice.

<details><summary>Full review</summary>

**Skip `<=`: correct.** A migration's `to_version` is the profile where the behavior changes. A tool already declaring that profile already has the new behavior, so advice about that change cannot apply. Old `<` gave a 26.0 tool the 26.0 advice and a 24.2 tool the 24.2 advice. For example, a 26.0 tool with an unqualified structured_like was told to fix something that, at its own profile, already fails at runtime (the linter covers that). New test: `test_advice_skipped_for_tool_already_at_profile` (red under `<`, green under `<=`). All existing tests still pass, so nothing relied on the old behavior.

**21.09 `add("")`:** `upgrade_codes_by_name[""]` raised KeyError for any tool <21.09 with whitespace in from_work_dir. The code `21_09_fix_from_work_dir_whitespace` already existed in the JSON. New test plus removal of the "Not yet tested" entry.

**`_find_all`:** it ignored its xpath. This was harmless until 26.1/26.2 called it with other xpaths. Direct test added.

**AbstractTool opt-in duplication:** the original re-derived the opt-ins from XML attributes (`format='auto'`, `from_provided_metadata`, `discover_via`). That could drift, e.g. format="auto" inside a collection's data, or a future opt-in. I extracted the nested function into module-level `output_uses_tool_provided_metadata` in `parser/output_objects.py`. `AbstractTool._uses_tool_provided_metadata` and the advisor (`tool_source.parse_outputs(None)`) now both use it. This also drops unused ToolOutput/ToolExpressionOutput imports from abstract_tool. Existing advisor tests (`all_output_types.xml`, `tool_provided_metadata_6.xml`) and `test/unit/app/tools -k provided_metadata` (25) pass.

**26.1:** the citation check reuses `parse_citation_elem`. The test-case diff (26.0 vs 26.1) reports only failures new at 26.1, which avoids duplicating 24_2 advice. The `profile` kwarg is a clean extension.

**26.2:** the optional boolean check (no `checked`) and the has_n_columns check (no `sep`) are simple and correct at `consider` level.

Imports are at module top and comments are short. No security findings.

Tests: `pytest test/unit/tool_util/upgrade test/unit/tool_util/test_tool_linters.py test/unit/tool_util/test_parameter_test_cases.py`: 204 passed. Pre-commit is green on every commit.
</details>
