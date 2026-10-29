Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# Thermo-nuclear code quality review (post re-scope)

This is a fresh pass over all 11 commits, `19281d57645..24d7dbfc8bf`. The first pass is in [earlier_drafts/1](earlier_drafts/1/thermo_nuclear_review.md).

I acted on one finding: `create_tool` now validates `GalaxyTool` in its shared format branch, which covers both `from_path` and `representation`, before the row is created. Before, the check sat only in the `from_path` branch. Folded into `bc47ccd52e3` (Validate…). Everything else was approved as is, or declined for the reasons below. The new tip is `376bf898dcb` (was `24d7dbfc8bf`). Not pushed.

New SHAs: `bc47ccd52e3` (Validate…), `2ea92cb4a34` (container requirement) and `376bf898dcb` (citations/hidden). Earlier commits are unchanged.

## Not acted on

- **The parser raises pydantic `ValidationError`, which leaks into `managers/tools.py` and `tools/__init__.py`.**
  - After the move there are still exactly two catch sites. They raise different exception types (400 vs `ToolMissingException`) with different messages, and they share only a one-line `"; ".join(format_validation_errors(e))`.
  - A domain error like `UntrustedToolSourceError` would need every new test that asserts `.errors()` locations or types to dig through `__cause__`. That covers the `LEGACY_DIALECT` table, the trust and model tests, and the citation test.
  - That is churn without a simpler flow.
- **`create_tool` still has two `tool_format == "GalaxyTool"` checks**: the `GalaxyUserTool` reject, and the format branch that now holds validation and id. Collapsing further means reordering row creation and the toolbox load, which is out of scope on a release branch.
- **`test_parsing.py` is at 1283 lines.** It was 1142 on base, so it doesn't cross the 1k line. Splitting the YAML test-parsing tests out would rewrite several commits.
- **`create_tool_from_path_raw` / `_post_dynamic_tool` split.** It follows the populator's `foo` / `foo_raw` idiom, and both helpers have callers.
- **`TestCollectionOutputDef.from_yaml_test_format` `elif attributes.collection_type`.** It matches the model, which has both spellings. It is shared with `test_framework_workflows.py`. I grepped `lib/galaxy_test/workflow/*-tests.yml` for `attributes:` and found no hits, so no workflow test gains a new assertion.

<details><summary>Full review</summary>

## Verdict

Approve after the one fix. The branch deletes more model than it adds:
- the scalar outputs (about 45 lines);
- `ContainerRequirement`;
- the `UserToolSourceAuthoringView.requirements` override;
- the `_LEGACY_FIXTURES` exemption.

Validation sits in the canonical layer (`YamlToolSource.__init__`), and the callers only translate the error. No file crosses 1k lines (`interface.py` 982, `yaml.py` 709).

## 1. `create_tool` GalaxyTool validation in the wrong branch (acted on)

- **Before:** `validate_galaxy_tool_source` ran inside `if tool_payload.src == "from_path"`, so a format check was nested in a source branch. A second `if tool_format == "GalaxyTool"` below handled the id.
- **The gap:** `representation` input is model-validated as the payload, and then `model_dump(by_alias=True, exclude_unset=True)` is stored. That dump is validated again only in `load_dynamic_tool` → `dynamic_tool_to_tool` → `YamlToolSource.__init__`. `ModelManager.create` has already committed the row by then.
- **The effect:** any round-trip drift would leave a committed broken row behind a `ToolMissingException`.
- **The fix:** the validation moved into the shared `if tool_format == "GalaxyTool":` branch, so one validation site covers both sources and runs before the row exists.
- **Message:** it now reads `Invalid GalaxyTool: …`. The old wording ("file") was wrong for `representation`.
- **The honest framing:** the representation round trip is stable in practice (the API tests are green). So the main gain is one validation site per format plus an atomic guard, not a reachable bug.

## 2. Re-scope code (checked, no action)

- `ToolSource._parse_citation_list` preserves XML's profile rule exactly: re-raise at 26.1+, otherwise warn and skip. It is generic because XML passes elements and YAML passes dicts, so the `TypeVar`/`Callable` earns its keep. `xml.py` loses about 20 lines.
- `hdca.visible = False` after `collections_manager.create` is the minimal seam, because `create` takes no `visible` argument. The HDCA is unflushed at that point.
- Removing `ContainerRequirement` is a clean deletion. The authoring-view override became redundant and went with it.
- `_parse_output_collection`'s `hidden` local matches the function's existing local-then-pass style.

## 3. Test parsing (checked, no action)

- `_parse_test` takes the `(name, value)` stream as its single flow, which pass 1 already collapsed.
- The collection and element helpers mirror XML's `(file, attributes)` tuples.
- The `assert_stdout`/`stdout` fallback keeps the class-less spelling working.

## 4. Tests (checked, no action)

- `format_souce` in `test_admin_yaml_tool_rejects_unknown_dataset_output_field` is a deliberate typo, because the test is about an unknown key.
- The tests are table-driven (`LEGACY_DIALECT` plus exact locations), and admin vs class-less are paired.

</details>

## Evidence

- `test_DynamicToolManager.py` + `test_user_defined_tool_loading.py`: 9 passed.
- API `test_tools.py -k dynamic_tool`, a single run with the beta-formats and conda overrides: 7 passed. That includes `from_path_rejects_legacy_dialect` (substring assert still matches) and `citations`.
- I re-ran the touched modules at each rewritten commit (`bc47ccd52e3`, `2ea92cb4a34`, `376bf898dcb`) with a `--exec` rebase: the manager, user-defined loading, yaml validation and trust tests passed 53/54/56. The SHAs are unchanged by the exec pass.
- No conflict markers in any commit. The pre-commit hooks pass, and ruff/black/isort are clean on `managers/tools.py`.
