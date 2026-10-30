# Component - Tool Linters

Cover the tool linter framework in `lib/galaxy/tool_util/lint.py` and `lib/galaxy/tool_util/linters/`: `Linter` subclasses, module discovery in `lint_tool_source_with_modules` (it scans every attribute of each linter submodule, so module-level generic aliases such as `dict[str, list[str]]` crash `issubclass` on Python 3.10), profile-gated linters, and `LintContext`. Include the output-reference resolvers (`_InputReferences` in `linters/output.py` on dev; the shared `parser/output_references.py` `InputReferences` on the unmerged `issue_23891_output_reference_resolver` and `issue_23902_qualified_output_references` branches): qualified vs legacy keys, repeat `_0` normalization, and how they mirror `LegacyUnprefixedDict` and `sliced_input_collection_structure` at runtime.

## Why

The #23884 redo wants to reuse the linter's reference resolver from the upgrade advisor and hit a discovery crash last time; no note covers the linters or where the resolver is headed.

## Requested by

- vault/repositories/galaxy/branches/active/upgrade_advice_structured_like/brain_research.md: needs resolver reuse design and the linter-discovery pitfall.

## Debrief

- Created `vault/research/Component - Tool Linters.md`, verified against Galaxy `origin/dev` @ `65e6daff`. It covers `lint.py` (`Linter`, `LintContext`, the entry points, discovery), profile-gated linters, the dev resolver `_InputReferences` in `linters/output.py`, and how its qualified keys, legacy keys and repeat `_0` normalization copy `visit_input_values`, `LegacyUnprefixedDict`, `collection_prototype` and `sliced_input_collection_structure`. Unmerged work is described separately under "Proposed (unmerged)". I didn't wait for it, because the request asked for both the dev baseline and where the resolver is going.
- Resolver reuse for the #23884 redo: draft PR #24524 moves the class to `linters/_util.py` as `InputReferences`, while `issue_23891_output_reference_resolver` moves it to `tool_util/parser/output_references.py`, built from `ToolSource`. The two moves conflict. `issue_23902_qualified_output_references` is stacked on an earlier, 26.2-gated version of #23891, which has since moved to 27.0, so #23902 needs a rebase and a new profile.
- Discovery pitfall: confirmed on CPython 3.10.22. Dev has no guard. Filed in `research_issues/linter-discovery-generic-alias-crash.md`.
- Also filed: `research_issues/type-source-legacy-paths-drop-all-groups.md` and `research_issues/lint-context-failed-unbound-below-warn.md`.
- Left out: what each of the 153 linters checks, the upgrade advisor itself (it has its own request, `tool_profile_versions_and_upgrade_advisor`), and planemo's lint CLI.
