# Component - Tool Linters

Cover the tool linter framework in `lib/galaxy/tool_util/lint.py` and `lib/galaxy/tool_util/linters/`: `Linter` subclasses, module discovery in `lint_tool_source_with_modules` (it scans every attribute of each linter submodule, so module-level generic aliases such as `dict[str, list[str]]` crash `issubclass` on Python 3.10), profile-gated linters, and `LintContext`. Include the output-reference resolvers (`_InputReferences` in `linters/output.py` on dev; the shared `parser/output_references.py` `InputReferences` on the unmerged `issue_23891_output_reference_resolver` and `issue_23902_qualified_output_references` branches): qualified vs legacy keys, repeat `_0` normalization, and how they mirror `LegacyUnprefixedDict` and `sliced_input_collection_structure` at runtime.

## Why

The #23884 redo wants to reuse the linter's reference resolver from the upgrade advisor and hit a discovery crash last time; no note covers the linters or where the resolver is headed.

## Requested by

- vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/brain_research.md: needs resolver reuse design and the linter-discovery pitfall.
