---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/collections
  - galaxy/client
  - galaxy/workflows
  - galaxy/tools/collections
  - galaxy/testing
status: draft
created: 2026-02-08
revised: 2026-02-08
revision: 1
ai_generated: true
github_pr: 19377
github_repo: galaxyproject/galaxy
galaxy_areas:
  - collections
  - client
  - workflows
  - tools
  - testing
related_notes:
  - "[[Component - Dataset Collections]]"
branch: collection_specification
---

## PR Summary

Large foundational PR (34 commits) extending Galaxy's dataset collection system with new collection types, a unified collection creation wizard, and formalized collection semantics documentation. Adds `paired_or_unpaired` and `record` collection types, replaces the old `PairedListCollectionCreator` with a general wizard-based builder, introduces a Rule Based Imports activity, and documents collection mapping/reduction semantics in a structured YAML spec tied to test cases.

## Key Feature Areas

- **`paired_or_unpaired` collections**: New collection type for mixed paired and unpaired data (`list:paired_or_unpaired`). Backend type plugin, collection builder UI, workflow editor support, tool compatibility, and a collection operation tool to split into homogeneous `list` + `list:paired` outputs. Addresses #6063.

- **`record` collection types**: Heterogeneous tuple-style dataset collections (generalization of `paired`). Collection type plugin, database migration, workflow editor form for field definitions, and rule builder support. Foundation for future sample sheet work and CWL integration.

- **Unified collection creation wizard**: Replaces `PairedListCollectionCreator` with a generalized `ListWizard` + `PairedOrUnpairedListCollectionCreator` that can build `list:paired`, `list:list`, `list:list:paired`, and `list:paired_or_unpaired` collections. History dropdown simplified to "Auto Build List" and "Advanced Build List". Auto-detects pairing from data.

- **Rule Based Imports activity**: New optional activity panel with wizard for seeding the rule builder. Replaces the compact `RulesInput.vue` approach with more intuitive wizard steps. Supports drag-and-drop of URI files.

- **Collection semantics documentation**: `collection_semantics.yml` spec with Markdown docs, mathematical examples, and test case references. Rendered into Sphinx docs. Covers mapping, reduction, and type compatibility rules. Serves as organized index of test coverage.

- **Backend collection abstractions**: New `adapters.py` module providing uniform interfaces for adapting various model objects to collection inputs. Addresses #19359.

- **Bugfixes**: Extension handling in existing list builder (#9497), HID handling unified between paired and flat list creators, workflow form collection type handling fixes.

## Testing Coverage

- **Unit tests**: `pairing.test.ts` for auto-pairing logic, extended `RuleDefinitions.test.ts`, migrated doctests to unit tests for collection models.
- **Integration/API tests**: Rule builder API test for paired/unpaired, updated `__EXTRACT_DATASET__` tests, workflow collection running tests.
- **Workflow editor tests**: New tests in `terminals.test.ts` with new test data.
- **Selenium tests**: Embedded list-of-pairs workflow run, paired/unpaired list creation from workflow input, list:list building in UI.
- **Structured test references**: `collection_semantics.yml` maps examples to `tool_runtime` and `workflow_editor` test cases.
