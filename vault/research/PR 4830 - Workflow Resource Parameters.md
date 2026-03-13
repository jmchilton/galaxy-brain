---
type: research
subtype: pr
tags: [research/pr, galaxy/workflows, galaxy/tools/runtime]
status: draft
created: 2026-03-12
revised: 2026-03-12
revision: 1
ai_generated: true
github_pr: 4830
github_repo: galaxyproject/galaxy
---

# PR #4830 Research Summary: Workflow-to-Job Scheduling Parameters

- **Title:** Workflow-to-Job Scheduling Parameters
- **Author:** JeffreyThiessen (Jeff Thiessen), with significant refactoring by jmchilton (John Chilton)
- **URL:** https://github.com/galaxyproject/galaxy/pull/4830
- **State:** MERGED (2018-03-20)
- **Merged by:** jmchilton
- **Base branch:** dev
- **Labels:** kind/feature, area/workflows

## High-Level Description

This PR adds the ability for administrators to define **workflow-level resource parameters** (CPU, memory, walltime, priority, etc.) that users can set when invoking a workflow. These parameters are then passed through to every job in the workflow, influencing job scheduling (particularly via Dynamic Tool Destination / DTD).

Key capabilities introduced:
1. Admin-configurable XML file defining available resource parameters (processors, memory, time, priority)
2. YAML-based mapper config that maps user groups to allowed resource parameter values
3. Pluggable Python function alternative for custom mapping logic
4. Resource parameters are serialized as `WorkflowRequestInputParameter` records with type `RESOURCE_PARAMETERS`
5. Parameters are injected into job params as `__workflow_resource_params__` and made available to DTD and dynamic job destinations
6. Validation of select-type parameters (e.g., priority) against user's allowed options

## Files Changed and Current Status

| PR File Path | Status | Current Location |
|---|---|---|
| `client/galaxy/scripts/mvc/tool/tool-form-composite.js` | GONE (rewritten) | Client rewritten in Vue.js; equivalent in `client/src/components/Workflow/Run/model.js` |
| `config/galaxy.yml.sample` | MOVED | `config/galaxy.yml.sample` still exists but config also at `lib/galaxy/config/sample/galaxy.yml.sample` |
| `config/workflow_resource_mapper_conf.yml.sample` | EXISTS | Same path, unchanged |
| `config/workflow_resource_params_conf.xml.sample` | EXISTS | Same path, unchanged |
| `lib/galaxy/config.py` | MOVED | Split into `lib/galaxy/config/__init__.py`; `workflow_resource_params_mapper` config still present there |
| `lib/galaxy/jobs/__init__.py` | EXISTS | Still uses `parse_resource_parameters` from `galaxy.util` |
| `lib/galaxy/jobs/dynamic_tool_destination.py` | EXISTS | Still contains the `__workflow_resource_params__` parameter extraction logic |
| `lib/galaxy/jobs/mapper.py` | EXISTS | Still exposes `workflow_resource_params` to dynamic destination functions |
| `lib/galaxy/managers/workflows.py` | EXISTS | Still uses `get_resource_mapper_function` and `_workflow_resource_parameters` |
| `lib/galaxy/model/__init__.py` | EXISTS | `RESOURCE_PARAMETERS = "resource"` type and `resource_parameters` property still present |
| `lib/galaxy/tools/execute.py` | EXISTS | Still handles `workflow_resource_parameters` kwarg and `__workflow_resource_params__` injection |
| `lib/galaxy/util/__init__.py` | EXISTS | `parse_resource_parameters` utility function still present |
| `lib/galaxy/webapps/galaxy/config_schema.yml` | MOVED | Now at `lib/galaxy/config/schemas/config_schema.yml`; still has `workflow_resource_params_mapper` schema |
| `lib/galaxy/workflow/modules.py` | EXISTS | Still reads `invocation.resource_parameters` and passes to execute; sits next to CWL tool path |
| `lib/galaxy/workflow/resources/__init__.py` | EXISTS | Core mapper logic unchanged |
| `lib/galaxy/workflow/resources/example.py.sample` | EXISTS | Unchanged |
| `lib/galaxy/workflow/run_request.py` | EXISTS | Still handles resource_params in `WorkflowRunConfig` and `build_workflow_run_configs` |
| `test/unit/jobs/dynamic_tool_destination/mockGalaxy.py` | MOVED | Now at `test/unit/app/jobs/dynamic_tool_destination/mockGalaxy.py` |

## Key Code Patterns and Current Locations

### 1. Resource Parameter Flow (workflow invocation -> job)
- **Entry point:** `lib/galaxy/workflow/run_request.py` - `build_workflow_run_configs()` reads `resource_params` from payload, validates select options, stores in `WorkflowRunConfig`
- **Serialization:** `workflow_run_config_to_request()` stores each resource param as a `WorkflowRequestInputParameter` with type `RESOURCE_PARAMETERS`
- **Deserialization:** `workflow_request_to_run_config()` reads them back
- **Injection into jobs:** `lib/galaxy/workflow/modules.py` reads `invocation.resource_parameters` and passes to `lib/galaxy/tools/execute.py` which injects as `__workflow_resource_params__`

### 2. Model Changes
- `lib/galaxy/model/__init__.py`: `WorkflowRequestInputParameter.types.RESOURCE_PARAMETERS = "resource"`
- `WorkflowInvocation.resource_parameters` property filters input_parameters by this type

### 3. DTD Integration
- `lib/galaxy/jobs/dynamic_tool_destination.py`: Reads `__workflow_resource_params__` from job parameters; workflow priority takes precedence over job-level priority

### 4. Dynamic Destination Integration
- `lib/galaxy/jobs/mapper.py`: Exposes `workflow_resource_params` as a named argument to dynamic destination functions

### 5. Mapper Framework
- `lib/galaxy/workflow/resources/__init__.py`: `get_resource_mapper_function()` supports three modes:
  - None -> null mapper (no resource params shown)
  - Python function reference (module:function)
  - YAML file with `by_group` mapping (group-based permission model)

## CWL Relevance

This PR has **minimal direct CWL impact** but is architecturally relevant:

1. In `lib/galaxy/workflow/modules.py`, the `resource_parameters` are extracted from the invocation and passed through to `execute()` in the same code path that handles both Galaxy native tools and CWL tools. The resource_parameters extraction happens *before* the `use_cwl_path` branch point, meaning CWL workflow steps also receive workflow resource parameters.

2. The `__workflow_resource_params__` parameter is injected alongside `__workflow_invocation_uuid__` in `lib/galaxy/tools/execute.py` - both follow the same pattern of being workflow-level metadata passed to individual jobs.

3. No CWL-specific handling of resource parameters was added; CWL tools in workflows get the same resource parameter treatment as Galaxy native tools.

## Architectural Decisions

1. **Pluggable mapper pattern:** Admin can use YAML config OR Python function for mapping users to resource parameters - extensible design
2. **Group-based permissions:** Default implementation ties resource parameter availability to Galaxy user groups
3. **Workflow-level priority overrides job-level:** When both workflow and job resource params specify priority, workflow wins (DTD integration)
4. **Validation at request time:** Select-type parameters are validated when the workflow invocation is created, not at job execution time
5. **Reuse of job resource parameter definitions:** If no workflow-specific resource params file is configured, falls back to `job_resource_params_file`
