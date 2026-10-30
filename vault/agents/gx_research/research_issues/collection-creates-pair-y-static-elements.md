# `collection_creates_pair_y.yml` declares static collection `elements:` the YAML parser ignores

- Area: test/functional/tools/collection_creates_pair_y.yml, lib/galaxy/tool_util/parser/yaml.py
- Found while: [[Component - YAML Tool Parser and Authoring Model Boundary]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

The fixture (in `sample_tool_conf.xml:223`, so it runs as a framework tool test) declares a `paired` collection output whose `forward`/`reverse` elements come from `elements: {forward: {from_work_dir: ...}, ...}`. Nothing in the YAML path reads `elements`:

- `_parse_output_collection` (`lib/galaxy/tool_util/parser/yaml.py:283-323`) builds `ToolOutputCollection` without known element outputs. The XML parser fills `output_collection.outputs` from `<data>` children (`parser/xml.py:556`).
- `dataset_collector_descriptions_from_output_dict` (`parser/output_collection_def.py:56-67`) only reads `discover_datasets`.
- The YAML test parser hard-codes `output_collections = []` (`yaml.py:477-478`), so the fixture's `class: Collection` expectations become a plain output entry rather than collection assertions.

The command also writes `'$reverse.fastq'` (a Cheetah leftover) inside single quotes, which never produces `reverse.fastq`. The fixture was committed as "YAML test for collection WIP." (`8d84e3dd11b`). `test_parsing.py:980-985` only checks that one collection output is parsed.

## Evidence / repro

Read in code. The `yaml_tool_model_validation_26.1` branch records (`implementation_debrief.md`, `test_challenges_debrief.md` under `vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/`) report that the framework test passed vacuously with empty datasets.

## Suggested fix

Rewrite the fixture with `discover_datasets` (or implement YAML static elements explicitly), fix the command, and implement YAML test collection parsing so the expectations are checked. Drop it from `_LEGACY_FIXTURES` in `test_user_tool_source_fixtures.py` once it validates.
