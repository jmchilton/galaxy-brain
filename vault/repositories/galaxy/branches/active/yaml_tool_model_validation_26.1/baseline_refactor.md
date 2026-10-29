Run via Claude Opus 5.5 at low effort.

One new base refactor: the shared citation helper, `ToolSource._parse_citation_list`, is now extracted from `XmlToolSource.parse_citations` in its own no-behavior-change commit. It sits with the earlier refactors, and the final citations/hidden commit now only adds the YAML caller. The final tree is unchanged.

This is a fresh pass after the re-scope. The first pass ([earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md)) already split out commits 2 and 3, so I only re-examined the two re-scope commits for new candidates.

## New history (base `19281d57645`, local only, not pushed)

1. `30f634afe49` Baseline tests for loading class-declaring YAML tool sources (unchanged, still first)
2. `3797304f268` Unify YAML tool test output parsing loop (unchanged)
3. `c9f1a8ac86e` Add create_tool_from_path_raw populator helper (unchanged)
4. `f44815ac98f` **Extract ToolSource._parse_citation_list from XML citation parsing** (new)
5. `7635a96463b` Verify collection outputs in YAML tool tests (was `9d0c7ea0e1a`)
6. `9c69a9f70e7` Read assert_stdout/assert_stderr in YAML tool tests (was `f82d794b5ec`)
7. `f73effdec08` Convert in-tree GalaxyTool YAML to the authoring model's form (was `1f0a56eca2c`)
8. `14a0bd413eb` Reject unknown keys on GalaxyTool dataset outputs (was `4cb6c828b2c`)
9. `f816f484267` Drop scalar outputs from the GalaxyTool authoring model (was `5c6c22cffe8`)
10. `732d7a153e6` Validate GalaxyTool YAML against its authoring model when loading (was `bc47ccd52e3`)
11. `3be27d3b4a1` Drop the container requirement from the GalaxyTool authoring model (was `2ea92cb4a34`)
12. `bbeabb0cc91` Load citations and honor hidden collection outputs in YAML tools (was `376bf898dcb`, now smaller, body reworded)

The pushed `jmchilton/yaml_tool_model_validation_26.1` still points at `376bf898dcb`, so publishing this history needs a force push.

## Refactor

- **What moved.** The `interface.py` and `xml.py` hunks of `376bf898dcb` now form commit 4: the helper, its `Callable`/`Iterable`/`TypeVar` imports, the module `log`, and XML's `parse_citations` delegating to it. The commit was built from `git diff 2ea92cb4a34 376bf898dcb` limited to those two files. I didn't check out the tip's `interface.py`, because that would have leaked the collection commit's `collection_type` `elif` into the refactor.
- **What stayed in the feature commit.** `YamlToolSource.parse_citations`, collection `hidden` in `yaml.py` and `actions/__init__.py`, and the tests.
- **Reworded commit body.** The feature commit's body said the rule is "now shared on ToolSource". It now says citations reuse the rule via `ToolSource._parse_citation_list`.
- **Behavior of XML tools is unchanged, with one exception.** XML's `source_path` property returns `_source_path`, so the helper's `self.source_path` is equivalent. The exception: the skip warning now logs under `galaxy.tool_util.parser.interface` instead of `...parser.xml`. No test checks the logger name or the message (grepped for `caplog` and the message text).
- **Pinned by existing tests.** The XML citation tests were already at base (`test_old_invalid_citation_dont_cause_failure_to_load`, `test_invalid_citation_not_allowed_in_modern_tools`, `test_legacy_doi_prefix_citation_is_normalized`). All three pass at commit 4.

## Considered, not moved

These either change behavior or only make sense with the feature:

- Dropping `ContainerRequirement`. Removing the `UserToolSourceAuthoringView.requirements` override is also in this group, since the override only becomes redundant once the base union narrows.
- YAML `parse_citations`.
- Collection `hidden` in the YAML parser and in `OutputCollections`.
- Everything the first pass already rejected (the `collection_type` `elif`, `validate_galaxy_tool_source`, and the error mapping in `managers/tools.py` and `tools/__init__.py`).

## Verification

- **Tree equality.** `HEAD^{tree}` == `376bf898dcb^{tree}` == `11931cabd49`.
- **Patch ids.** Commits 1–3 keep their SHAs. Commits 5–11 are patch-id-identical to their originals (`git patch-id --stable`). Commit 4's patch id equals that of the original `interface.py`+`xml.py` diff. Commit 12 lost exactly those two files.
- **No conflict markers.** The rebase had no conflicts. Grepping the range for `^<<<<<<<` and `^>>>>>>>` returned rc=1.
- **Touched unit modules pass at every rewritten commit (4–12).** I ran them in a temp detached worktree with the main `.venv`: 345, 348, 349, 351, 352, 356, 372, 373, 375 passed. The modules are `test_parsing`, `test_user_tool_parser_trust`, `test_yaml_tool_source_validation`, `test_user_tool_source_validation`, `test_tool_linters`, `test_ontologies`, `test_user_tool_source_fixtures`, `test_container_shape_lint`, `test_tool_deserialization` and `test_user_defined_tool_loading`.
- **mypy.** At commit 4, mypy on `interface.py` and `xml.py` reports the same 14 errors as base (`cwl.py`, `xml.py`, `yaml.py`; diffed with line numbers ignored), so the refactor adds none. ruff, black and isort are clean, and the pre-commit hooks passed on the new commit and on the amended one.
- **Cleanup.** The temp worktree has been removed.
