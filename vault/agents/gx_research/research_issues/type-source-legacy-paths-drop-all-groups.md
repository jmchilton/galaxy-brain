# `type_source` legacy-path check drops every conditional/section, unlike runtime

- Area: lib/galaxy/tools/parameters/__init__.py
- Found while: [[Component - Tool Linters]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`_data_input_paths` (`tools/parameters/__init__.py:327-346`) says its legacy paths "drop conditional and section names, as the `prefix` passed by `visit_input_values` does". For a conditional or section, though, it passes `legacy` through unchanged, so **every** enclosing group name is dropped. `visit_input_values` drops only the innermost one, because it passes `parent_prefix=name_prefix` (`:261-272, 298-300`). For an input at `outer|inner|x`, runtime's legacy alias is `outer|x`, but `_data_input_paths` gives `x`.

`qualify_legacy_data_input_reference` (`:353-367`) drives the load-time `type_source` check in `Tool.parse_outputs` (`tools/__init__.py:1855-1860`):

- `type_source="x"` gets the load error "must be qualified as 'outer|inner|x'". That outcome is right, but for a reason runtime doesn't share.
- `type_source="outer|x"`, which is runtime's real legacy alias, matches neither pattern, so it **passes** the load check. It then fails at job time in `DefaultToolAction` (`tools/actions/__init__.py:1230-1234`), because `input_collection_parameters` is keyed by qualified name only.

The linter's `_InputReferences` (`tool_util/linters/output.py:315-369`) models the innermost-only rule correctly, so Galaxy has two walkers that disagree.

## Evidence / repro

Read in code. No test covers nested conditionals or sections for `type_source`.

## Suggested fix

Make the conditional and section branches pass `qualified` as the new `legacy`, as the linter does. Alternatively, land `issue_23891_output_reference_resolver`, which replaces this walker with the shared `InputReferences` resolver. Add a load test with `type_source` set to a mid-level alias.
