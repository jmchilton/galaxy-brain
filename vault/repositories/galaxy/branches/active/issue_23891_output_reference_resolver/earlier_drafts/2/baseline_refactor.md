Split the first commit into a pure, no-behavior-change refactor (move the linter's input reference walker into `tool_util/parser/output_references.py` as `InputReferences`, built from `ToolSource`) and moved every fix-specific piece into the #23891 fix commit.

## Refactor commit

`0858c00a9e9` Move linter's input reference walker into tool_util as InputReferences

- `InputReference`, `InputReferences`, `ResolvedReference(reference, path, selector, matches, legacy)`, `split_element_selector` live in `lib/galaxy/tool_util/parser/output_references.py`; `linters/output.py` uses them.
- Removed from the original first commit (they now arrive with the fix): `runtime_key`, `_reindex`, `OUTPUT_REFERENCE_PARAM_TYPES`, `output_reference_problem`, and the `_normalize_segment` helper (base's `normalize` kept verbatim).
- Pulled in the `value_from` conditional guard (formerly `10c48845270`) so the ToolSource walker doesn't regress linting of `value_from` conditionals, which the XML walker skipped.
- `test_tool_linters.py`: 142 passed on this commit against `origin/dev`.

## Rest of the branch

Original commits replayed on top: the fix (`63ffa8b0c21`, original message) adds the runtime-key/problem logic; review commits follow. The `value_from` commit became test-only and was renamed "Test output reference resolution with a value_from conditional". "Shorten output reference test comments" moved to the end (it had been missed during replay; harmless reorder).

Final tree is byte-identical to the pre-refactor HEAD `e52f77f32dc` (kept as local branch `issue_23891_output_reference_resolver_pre_baseline`). New HEAD `f323237f519`, force-pushed to `jmchilton`. Unit suites (linters + both `test_output_references.py`) pass: 156.
