# Files Index: Workflow Tool State Project

## Development Branches

| Repo | Branch/Worktree | Path |
|---|---|---|
| Galaxy | `wf_tool_state` | `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state` |
| gxformat2 | `wf_state` | `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state` |

## Research & Planning (galaxy-brain vault)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - Workflow Format Differences.md` | Deep comparison of .ga vs Format2, including `tool_state` vs `state` analysis |
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - Tool State Specification.md` | 12 state representations, Pydantic model architecture, test infrastructure |
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/research/PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0.md` | Tool Shed API for serving tool schemas (ParsedTool, parameter models) |
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/PROBLEM_AND_GOAL.md` | Problem description and deliverables (this project's issue body) |
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/FIRST_STEPS.md` | Next planning steps and unresolved questions |
| `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/COMPONENT_WORKFLOW_STATE_INITIAL_WORK.md` | Summary of initial branch work |

## Galaxy — Workflow State Validation & Conversion (new code on branch)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/__init__.py` | Package init |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/_types.py` | `GetToolInfo` protocol, type aliases for step/workflow dicts |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/validation.py` | Top-level `validate_workflow()` dispatcher (detects format, delegates) |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/validation_format2.py` | Format2 validator — `state` + `in` validation against tool models |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/validation_native.py` | Native validator — `tool_state` + `input_connections` validation |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/convert.py` | `convert_state_to_format2()` — native→format2 state conversion |

## Galaxy — Format2 Abstraction Layer (new code on branch)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/workflow/format2.py` | `convert_to_format2()`, `convert_from_format2()`, `Format2ConverterGalaxyInterface` |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/workflow/gx_validator.py` | `GalaxyGetToolInfo` — concrete `GetToolInfo` using stock tools |

## Galaxy — Tool State Specification Infrastructure (existing)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util_models/parameters.py` | All parameter model classes, `StateRepresentationT`, `DynamicModelInformation` |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util_models/_types.py` | Type helpers |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util_models/_base.py` | Base model |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/__init__.py` | Public API re-exports |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/state.py` | `ToolState` base + 12 concrete subclasses |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/model_validation.py` | `validate_against_model()` + per-representation validators |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/factory.py` | `input_models_for_tool_source()` — tool XML/YAML → parameter models |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/convert.py` | `decode()`, `encode()`, `fill_static_defaults()`, etc. |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/parameters/visitor.py` | `visit_input_values()` tree traversal |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/model_factory.py` | `parse_tool()`, `parse_tool_custom()` |

## Galaxy — Tests (on branch)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/test_workflow_validation.py` | Native + Format2 workflow validation tests |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/test_workflow_state_conversion.py` | Native→Format2 state conversion tests |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/test_workflow_validation_helpers.py` | `GalaxyGetToolInfo` tests |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/test_convert.py` | Format2↔native roundtrip test |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/valid/` | Valid Format2 workflow test fixtures |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/workflows/invalid/` | Invalid Format2 workflow test fixtures |

## Galaxy — Tool State Specification Tests (existing)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/tool_util/test_parameter_specification.py` | Spec-driven parameter validation test runner |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/unit/tool_util/parameter_specification.yml` | ~2245 lines of valid/invalid payloads per representation |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/test/functional/tools/parameters/` | ~104 test tool XML/YAML/CWL files |

## gxformat2 — Core Library

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/converter.py` | `python_to_workflow()` — Format2→native conversion, `state`/`tool_state` handling |
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/export.py` | `from_galaxy_native()` — native→Format2 export |
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/interface.py` | `ImporterGalaxyInterface` — extension point for Galaxy integration |
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/lint.py` | Format2 linting |
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/normalize.py` | Workflow normalization |
| `/Users/jxc755/projects/worktrees/gxformat2/branch/wf_state/gxformat2/model.py` | Schema-salad workflow model |

## Tool Shed API (existing, serves tool schemas)

| File | Contents |
|---|---|
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/tool_shed/webapp/api2/tools.py` | `show_tool`, `tool_state_request`, `parameter_landing_request_schema` endpoints |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/tool_shed/managers/tools.py` | `parsed_tool_model_cached_for()`, `tool_source_for()` |
| `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/tool_shed/managers/model_cache.py` | `ModelCache` — disk caching of parsed tool models |
