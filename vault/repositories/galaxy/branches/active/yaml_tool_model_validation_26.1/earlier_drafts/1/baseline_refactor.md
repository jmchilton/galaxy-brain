Run via Claude Opus 5.5 at low effort.

Two base refactors now sit right after the baseline tests: a new no-behavior-change commit that unifies the YAML tool test output parsing loop (split out of the collection-outputs commit), and the existing `create_tool_from_path_raw` populator helper, moved up from just before the final commit. The final tree is unchanged.

## New history (base `19281d57645`, local only, not pushed)

1. `30f634afe49` Baseline tests for loading class-declaring YAML tool sources (unchanged, still first)
2. `3797304f268` **Unify YAML tool test output parsing loop** (new)
3. `c9f1a8ac86e` Add create_tool_from_path_raw populator helper (moved; was `ed38642e9c2`)
4. `e568f7eca97` Verify collection outputs in YAML tool tests (was `77f104b3ec4`, now smaller)
5. `ecf46dbe1b4` Read assert_stdout/assert_stderr in YAML tool tests (was `1c1cc05987b`)
6. `7fc006db273` Convert in-tree GalaxyTool YAML to the authoring model's form (was `7b6ea1ebb5d`)
7. `8f77e3e005b` Reject unknown keys on GalaxyTool dataset outputs (was `80dee331603`)
8. `401e011ece6` Drop scalar outputs from the GalaxyTool authoring model (was `759b1c72731`)
9. `1a5b68ca6b2` Validate GalaxyTool YAML against its authoring model when loading (was `bfc06ef13e6`)

The pushed `jmchilton/yaml_tool_model_validation_26.1` still points at `bfc06ef13e6`. Pushing needs a force push.

## Refactors

- **`_parse_test` loop unification.** The dict-form and list-form test outputs now go through one `named_outputs` loop, and the per-output defaults, `assert_list` and `extra_files`/`metadata` setup are extracted into `_parse_test_output_attributes`. This keeps base behavior exactly: a string-valued output still gets `attributes = {}`, and `metadata` is still forced to `{}`. The collection commit then adds only the `class: Collection` branch, the element-test helpers, the `{"file": value}` attributes simplification and the `metadata` pass-through.
  - Equivalence check: a scratch script ran dict-with-string, dict-with-dict (asserts/metadata), list-form, and empty `outputs` through `_parse_test` at the baseline and at the refactor. The JSON output was identical.
- **Populator helper moved up.** It's a pure test-helper refactor (`create_tool_from_path` still asserts 200 and returns JSON), and it's the only commit touching `populators.py`, so the move can't conflict.

## Considered, not moved

- The `interface.py` `collection_type` `elif`, the `metadata` read, `validate_galaxy_tool_source`, the `_parse_output_collection` comment rewording, and the `managers/tools.py`/`tools/__init__.py` error mapping. Each one either changes behavior or only makes sense with the feature.

## Verification

- `HEAD^{tree}` == `bfc06ef13e6^{tree}` == `722e348fe2b`.
- Commits 3 and 5–9 are patch-id-identical to their originals (`git patch-id --stable`). Commit 4 shrank by design. The trees of commits 4–8 differ from the originals only in `populators.py`, because the helper moved earlier.
- No conflict markers in any commit (`git grep '^<<<<<<<\|^>>>>>>>'` over the range, rc=1).
- The one rebase conflict (`yaml.py` when replaying the collection commit) was resolved by taking `77f104b3ec4`'s `yaml.py` verbatim. No commit between the baseline and that commit touches `yaml.py` apart from the refactor.
- Touched unit modules were run at every commit in a temp detached worktree: 333, 333, 333, 336, 337, 339, 340, 344, 360 passed. Those modules are `test_parsing`, `test_user_tool_parser_trust`, `test_yaml_tool_source_validation`, `test_user_tool_source_validation`, `test_tool_linters`, `test_ontologies`, `test_user_tool_source_fixtures`, `test_tool_deserialization` and `test_user_defined_tool_loading`. ruff/black/isort are clean on each commit's changed `.py` files, and the pre-commit hooks passed on the new commit.
- The temp worktree has been removed.
