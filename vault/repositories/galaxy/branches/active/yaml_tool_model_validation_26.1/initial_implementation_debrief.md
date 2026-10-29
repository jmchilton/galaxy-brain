# yaml_tool_model_validation_26.1 — initial implementation debrief

The next #23888 chunk after the merged #24365. `class: GalaxyTool` YAML is treated as a trusted user-defined tool: it must validate against the `GalaxyTool` authoring model wherever it is loaded. Targets `release_26.1`. Tip `01767e066a7` on `jmchilton/yaml_tool_model_validation_26.1`; 18 files, +519/−187 (production ~110).

```
created .../differential-review/snapshots/20261029T003733Z-implementation-01767e066a76.json
  implementation @ 01767e066a76 vs origin/release_26.1 (merge-base 19281d57645f)
  first snapshot: 7 commits, 18 files, 54 hunks
```

## Commits

1. `7da402b72aa` Baseline tests for loading class-declaring YAML tool sources.
2. `ae20db42db7` Verify collection outputs in YAML tool tests. YAML tests never filled `output_collections`, so `collection_creates_pair_y` passed vacuously. Its static `elements` were never implemented and produced empty datasets (confirmed red under real verification). The fixture now uses `discover_datasets`, and element tests are `(file, attributes)` tuples like XML's.
3. `88c8ae27886` Read `assert_stdout`/`assert_stderr` in YAML tool tests. That is the model's spelling; until now the parser read only `stdout`/`stderr`.
4. `edef23853d7` Convert in-tree GalaxyTool YAML to the model's form (`simple_constructs.yml`, `minimal_tool_no_id.json`, embedded unit-test YAML) and drop the `_LEGACY_FIXTURES` exemption. The `TestYamlLoader` assertions on Cheetah `command`/`interpreter`/`runtime_version`/packages/credentials move to a class-less fixture rather than being deleted.
5. `8370c9aabfa` `IncomingToolOutputDataset` `extra="forbid"`.
6. `7852ab66c85` Drop scalar (`text`/`integer`/`float`/`boolean`) outputs from the incoming authoring union.
7. `01767e066a7` `YamlToolSource.__init__` validates `class: GalaxyTool` dicts against the model, on a deepcopy because the model normalizes mapping outputs in place. `create_tool` rejects an invalid `from_path` file with a 400 before a row exists. `dynamic_tool_to_tool` turns an invalid stored row into `ToolMissingException`. The trust tests flip: admin YAML now refuses Cheetah `command`/`base_command`/`runtime_version`/`tool_type`/`entry_points`, expression validators and `dynamic_options`, and class-less YAML keeps them.

## Decisions

- **Scope (John, this session):** "Base". GalaxyTool on every path, class-less untouched, stored GalaxyTool rows fail loud.
- **GalaxyUserTool not validated at parser construction.** I tried it first. It broke `test_tool_deserialization` cases that load historical user-tool raw sources (RST help, tool-provided-metadata discovery). Stored `ToolSource` snapshots are re-parsed (`services/base.py` `_encode_tool_request`), and user tools already have the creation model plus `lift_user_tool_source`. The review agreed.
- **Collection-output and `assert_stdout` test parsing added** (not in the original ask). Converting the pair fixture showed its test had never verified anything, and the review found `assert_stdout` was a dead end once `stdout:` became model-invalid. Both are small and red→green.
- Validation is plain `model_validate` on the raw dict. The parser still reads the raw dict, not the dump, so #24365's dump-policy concerns don't come back.

## Validation

- Touched unit modules pass at every commit (328→365).
- Broad unit run (`tool_util`, `app/tools`, `app/managers`, `workflows`): green except the known env failures (cwl, conda, mulled, watcher, container registry).
- The framework tests for all 13 test-carrying in-tree YAML tools pass (20 cases), including the pair collection and the stdout assertions.
- API `test_tools.py` dynamic-tool tests (`from_path`, `no_id`, `shell_command`, `show`) pass.
- ruff/black/isort clean. mypy: only the pre-existing `yaml.py` `filters = []` error.

## Review

Normal review: [subagents/normal_review_1.md](subagents/normal_review_1.md). Both bugs were fixed, the recommended stdout fix was taken, and most nits were taken.

## Noted, not done

- The `ContainerRequirement` in the model's `requirements` is ignored by the YAML parser, which reads only the root `container`. It's another model/loader mismatch.
- Test `metadata`, `attributes.collection_type` and YAML element `expected_sort_order` are ignored by the parser.
- `_encode_tool_request` on a historical legacy-dialect GalaxyTool request now errors (fail-loud as decided).
