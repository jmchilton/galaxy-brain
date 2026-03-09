# Plan: Validate Specification Against Actual Code -- DONE

## Overview

Implement the `check()` stub in `semantics.py` to validate that all test references in `collection_semantics.yml` resolve to real code.

Implemented in commit `7c91cc0d8b` ("Add collection semantics validation and unit tests").

## Audit Results: 2 Bugs Found -- FIXED

Both bugs fixed as part of the [Review plan](COLLECTION_SEMANTICS_PLAN_REVIEW.md) (categories 2.2 and 2.3).

- ~~**Bug 1:** `LIST_REDUCTION` had duplicated `test_tools.py::` in `api_test` path~~ (Review 2.2)
- ~~**Bug 2:** `BASIC_MAPPING_PAIRED` used `wf_editor` instead of `workflow_editor`~~ (Review 2.3)

---

## Phase 0: Unit Tests for `semantics.py` -- DONE

Test file: `test/unit/data/model/test_collection_semantics.py` (39 tests)

| Step | What | Status |
|------|------|--------|
| 0.1 | YAML Loading & Pydantic Parsing | DONE -- `test_yaml_loads_and_parses` |
| 0.2 | Entry Type Classification | DONE -- `test_all_entries_are_doc_or_example`, `test_has_both_doc_and_example_entries` |
| 0.3 | `expression_to_latex` | DONE -- parametrized test (8 cases) + `paired_or_unpaired` atomicity + wrap true/false |
| 0.4 | `elements_to_latex` | DONE -- single None, nested dict, multiple keys |
| 0.5 | Model `.as_latex()` methods | DONE -- `DatasetsDeclaration`, `ToolDefinition`, `CollectionDefinition` |
| 0.6 | `collect_docs_with_examples` | DONE -- no examples, with examples, without-then excluded, multiple sections |
| 0.7 | CLI Arg Parsing | DONE -- default, `--check`, `-c` |
| 0.8 | `ExampleTests` `extra='forbid'` | DONE -- rejects unknown keys, accepts valid keys |

---

## Phase 1: `check()` Validators -- DONE

All validators implemented as standalone functions, wired into `check()` which returns aggregated error list.

| Step | Validator | Implementation | Tests |
|------|-----------|---------------|-------|
| 1.1 | `validate_api_test_refs()` | `ast.parse()` resolution of `file::func` and `file::class::method` | clean YAML pass + bad file + bad function + bad method |
| 1.2 | `validate_tool_refs()` | `test/functional/tools/<id>.xml` existence check | clean YAML pass + nonexistent tool |
| 1.3 | `validate_workflow_editor_refs()` | Regex `it("...")` extraction from `terminals.test.ts` | clean YAML pass + bad ref |
| 1.4 | `check()` integration | Calls all 3 validators, returns `list[str]` | `test_check_returns_no_errors` |

Helper `_load_examples()` extracts `Example` objects from YAML for validators.

---

## Critical Files

| File | Role |
|------|------|
| `test/unit/data/model/test_collection_semantics.py` | 39 unit tests |
| `lib/galaxy/model/dataset_collections/types/semantics.py` | `check()` + 3 validators + `extra='forbid'` |

## Resolved Questions

1. ~~Should `--check` be check-only or check-then-generate?~~ Currently check-then-generate (both run in `main()`).
2. ~~Validation failures: hard errors or return list?~~ Returns `list[str]` -- caller decides.
3. ~~Accept both file formats?~~ Yes, handles both `file::func` (2-part) and `file::class::method` (3-part).
4. Add bidirectional check (flag tests NOT referenced by spec)? -- future work
5. ~~For framework tools, verify XML `<tests>` or just existence?~~ File existence only.
6. ~~Standalone functions or methods?~~ Standalone functions (`validate_api_test_refs`, `validate_tool_refs`, `validate_workflow_editor_refs`).
7. ~~`extra='forbid'` scope?~~ Applied to `ExampleTests` only.
