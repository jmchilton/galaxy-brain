# yaml_tool_model_validation_26.1 — implementation debrief

**STATUS: BLOCKED. Parked on a scope decision for John.** The second scope evaluation recommends another change, so the branch parks here instead of re-scoping a second time.

Tip `6c43b516f4d` on `jmchilton/yaml_tool_model_validation_26.1`, base `origin/release_26.1` (`19281d57645`). 12 commits, 25 files, +671/−398. `schema.ts` (about 150 lines) is generated; production under `lib/galaxy` is roughly +136/−135. Alt: `yaml_tool_model_validation_26.1_alt_original_scope` (`1a5b68ca6b2`, [alt](alts/original_scope.md)).

```
exists .../differential-review/snapshots/20261029T033145Z-hardening-6c43b516f4de.json
  hardening @ 6c43b516f4de vs origin/release_26.1 (merge-base 19281d57645f)
  since 20261029T003733Z-implementation-01767e066a76:
    commits: 0 same, 1 rebased, 5 changed, 6 new, 1 dropped
    hunks:   44 carried, 6 changed, 25 new, 4 dropped
```

## What it does (#23888 slices 3, 5 and the validation half of 4)

`class: GalaxyTool` YAML is a trusted user-defined tool. Every field its authoring model accepts now takes effect at load and run time, and nothing else is accepted.
- **Validation everywhere.** `YamlToolSource.__init__` validates `class: GalaxyTool` dicts against the model on disk, through the raw-source factory, from stored rows and on `from_path`.
  - That rejects the legacy dialect: Cheetah `command`, `base_command`/`arguments`, `runtime_version`, `when:`, select `display`, untyped outputs, numeric `version`, static `elements`, `package` requirements, `credentials`, expression validators and `dynamic_options`.
  - `create_tool` returns a 400 before a row is created. An invalid stored row raises `ToolMissingException`.
- **Model tightened.** Admin dataset outputs reject unknown keys. Scalar outputs and the `{type: container}` requirement leave the model. Both `schema.ts` changes were regenerated.
- **Loader catches up with the model.** Citations load, for both classes and class-less YAML; invalid ones follow XML's profile rule, now shared as `ToolSource._parse_citation_list`. Hidden collection outputs create hidden HDCAs.
- **YAML tool tests actually test.** `class: Collection` outputs are verified (element `file`, `asserts`, `metadata`, `attributes.collection_type`), and so are `assert_stdout`/`assert_stderr`. Tests without `outputs` parse.
  - `collection_creates_pair_y` had been passing vacuously: its static `elements` were never implemented and produced empty datasets.
- **Fixtures.** In-tree fixtures are converted and the `_LEGACY_FIXTURES` exemption is gone.
- **Unchanged.** Class-less YAML keeps its dialect. `GalaxyUserTool` isn't validated at construction, because historical raw-source snapshots must keep loading and user tools already have the creation model plus the stored-row lift.

## Decisions

- **Scope.** John's 2026-10-28 answer was "Base, fail loud". The first scope evaluation then recommended closing the model-accepted, loader-dropped fields, and I re-scoped per the workhorse process (alt kept).
- **Additions beyond the original ask.** These were found during the work, and each is red→green:
  - collection and stdout test verification
  - test `metadata`/`collection_type`
  - collection `hidden` at runtime, rather than removing the field
  - the citation helper
- **Second scope evaluation.** It recommends Scope 2 (below), so the branch is parked.

## The decision John needs to make

The final commit loads citations for `GalaxyUserTool` too. Traced through the code (not checked in the UI), the tool form footer then fetches `api/tools/{id}/citations`, and `CitationsManager._get_tool` resolves by id only, so it never finds user tools. That gives an empty "References" heading, or the citations of an admin tool with the same id. Before this branch, YAML citations were always empty, so the branch introduces this visible regression. Options from [scope_evaluation.md](scope_evaluation.md):
- **Scope 2 (recommended by the evaluation).** Resolve user tools by uuid plus user in the citations endpoint, and use `tool_for_job` for history citations. That's about 20 production lines and 2 API tests, and it also fixes the existing "Tool not found" entries for user-tool jobs.
- **Scope 3 (contract).** Don't load `GalaxyUserTool` citations on this branch; admin `GalaxyTool` citations keep working. That's a few lines.
- **Split.** The history is shaped for PR splits (decompositions in the scope evaluation): test-parsing fixes, then model tightening, then load-time validation.

Prior reviews and tests that still apply whichever option is chosen:
- the normal reviews (2), test challenges, thermo-nuclear, baseline refactor and Codex reviews
- every unit, framework and API test listed below

Still to validate for Scope 2: an API test covering user-tool citations through `/api/tools/{id}/citations` (or its uuid variant), and the history citations path.

## Validation

- Touched unit modules pass at every commit (348→379). The broad unit run (`tool_util`, `tool_util_models`, `app/tools`, `app/managers`, `workflows`) is green apart from the known env failures (cwl, conda, mulled, watcher, container registry).
- The framework tests for all 13 test-carrying in-tree YAML tools pass (20 cases). That run predates the second-pass changes, which touch neither these fixtures nor the paths they exercise.
- API tests:
  - `test_tools.py -k dynamic_tool`: 7 passed, including `from_path_rejects_legacy_dialect` and `citations`.
  - `test_unprivileged_tools_labels.py`: 7 passed, including `hidden_collection_output_is_hidden`.
  - `test_dynamic_tool_from_path` with the converted fixture passes.
- Every non-baseline new test was shown red at its own assertion without its change; the baseline tests pass on base.
- `make format`: no changes. mypy on changed lib files: only pre-existing errors (`yaml.py` `filters = []`, `xml.py:126–129`).
- No CI has run on this tip.

## Debriefs

[initial](initial_implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [test challenges](test_challenges_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md) · reviews in `subagents/` · first pass in `earlier_drafts/1/`.

## PR-body notes (for whoever writes it)

- This is a one-way door on a release branch. Every capability removed from `GalaxyTool` YAML should be listed: Cheetah `command`, `base_command`/`arguments`, `runtime_version`/`interpreter`, `tool_type`, `entry_points`, conda `package` requirements, tool-level `credentials`, expression validators, `dynamic_options`, scalar outputs and the container requirement form.
- A stored or historical legacy-dialect `GalaxyTool` row or `ToolRequest` now fails loud. `_encode_tool_request` raises on read.
- `ContainerRequirement` is removed from `galaxy-tool-util-models`. It was a public import in 25.1/26.0, with no known consumers; galaxy-tool-util-ts needs a schema regen.
- planemo consumes galaxy-tool-util. Linting class-declaring YAML now raises on construction for invalid tools.
- Mapped-over (implicit) collections don't apply `hidden`.
