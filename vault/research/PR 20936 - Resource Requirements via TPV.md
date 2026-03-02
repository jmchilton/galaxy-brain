---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools/runtime
status: draft
created: 2026-02-24
revised: 2026-02-24
revision: 1
ai_generated: true
github_pr: 20936
github_repo: galaxyproject/galaxy
---

# PR #20936 Research: Wire up and test resource requirement via TPV

- **URL**: https://github.com/galaxyproject/galaxy/pull/20936
- **Author**: mvdbeek (Marius van den Beek)
- **State**: MERGED (2025-10-01)
- **Base**: `dev` <- `resource_requirements_tpv`
- **Merge commit**: `34fac8921b15cd4b57c0e99c0186fd50f4cfa567`
- **Stats**: +119 / -6 across 9 files

## Purpose and Motivation

This PR wires up Galaxy's tool resource requirements (e.g. `cores_min`, `ram_min`) to be consumed by Total Perspective Vortex (TPV) for job destination routing. Previously, resource requirements declared on tools were parsed but not actually forwarded to TPV for scheduling decisions.

The PR depends on upstream TPV changes:
- https://github.com/galaxyproject/total-perspective-vortex/pull/166 ("Implement basic version of resource requirements")
- TPV 3.1.0 introduces the ability to read resource requirements from Galaxy tools and use them for destination mapping (e.g. setting `{cores}` in env vars based on `cores_min`).

## Key Changes

### 1. Bug fix: Skip null resource requirement values
**File**: `lib/galaxy/tool_util/deps/requirements.py` (lines ~303-308)

The core logic change. When iterating resource requirement fields from a tool definition, `None` values are now skipped instead of being passed to `ResourceRequirement()`. All CWL ResourceRequirement fields are optional, so a tool might declare only `coresMin` without `ramMin`, etc. Before this fix, `None` values would be passed through, likely causing errors or incorrect behavior in TPV.

```python
# Before:
rr.append(ResourceRequirement(value_or_expression=value, resource_type=key))

# After:
if value is not None:
    # all resoure requirement fields are optional
    rr.append(ResourceRequirement(value_or_expression=value, resource_type=key))
```

### 2. TPV version bump to 3.x
**File**: `lib/galaxy/dependencies/conditional-requirements.txt`
- `total-perspective-vortex>=2.3.2,<3` -> `total-perspective-vortex>=3.1.0,<4`

**File**: `pyproject.toml`
- Added `total-perspective-vortex>=3.1.0,<4` to `[project.optional-dependencies] test` section
- Fixed `nodejs-wheel==22` -> `nodejs-wheel>=22,<23` (incidental fix)

### 3. New TPV job configuration for integration tests
**File**: `test/integration/embedded_pulsar_tpv_job_conf.yml` (new file, 44 lines)

A complete TPV-based job configuration that:
- Defines `local` and `pulsar_embed` runners
- Uses `dynamic_tpv` as the default execution environment
- Configures inline TPV configs with two destinations:
  - `local`: runs locally, sets `GALAXY_SLOTS` to `{cores}`
  - `user_defined`: runs on pulsar_embed with docker, sets `GALAXY_SLOTS` to `{cores}`, accepts `support_user_defined` scheduling tag
- Defines a default tool template with `cores: 1` (abstract)
- Routes `user_defined-*` tools to require `support_user_defined` scheduling tag
- The `{cores}` template in `GALAXY_SLOTS` env var is the key mechanism: TPV resolves this from the tool's resource requirements

### 4. Integration test for resource requirements via TPV
**File**: `test/integration/test_user_defined_tool_job_conf.py`

Refactored existing test class and added new TPV-specific test:

- Extracted `job_config_file` as a class attribute (was hardcoded in `handle_galaxy_config_kwds`)
- Added `TOOL_WITH_RESOURCE_SPECIFICATION` - a user-defined tool YAML with:
  - `cores_min: 2` resource requirement
  - Shell command `echo $GALAXY_SLOTS > galaxy_cores.txt`
  - Output that captures the cores value
- New test class `TestUserDefinedToolRecommendedJobSetupTPV` inherits from the existing test class but uses the TPV job config
- `test_user_defined_applies_resource_requirements()`:
  1. Creates a user-defined tool with `cores_min: 2`
  2. Runs the tool
  3. Asserts output file contains `2.0\n` (TPV set `GALAXY_SLOTS` to 2.0 based on `cores_min`)

### 5. Dependency updates (incidental)
- `nodejs-wheel` pinned version updated `22.13.0` -> `22.20.0`
- `nodejs-wheel-binaries==22.20.0` added
- Various type stubs added: `types-cachetools`, `types-requests`, `types-urllib3`
- `mypy`, `cachetools`, `pathspec` added to test dependencies

### 6. ToolSourceSchema.json regenerated
Single-line JSON schema file regenerated (likely reflects the resource requirement model changes or other schema updates at the time).

## Architecture / Design Decisions

1. **TPV inline config**: The test uses inline TPV configuration (`tpv_configs` with literal YAML) rather than external TPV config files. This keeps the test self-contained.

2. **`{cores}` template variable**: TPV's `{cores}` template in the `GALAXY_SLOTS` env var is resolved at job dispatch time from the tool's resource requirements. This is the core wiring mechanism.

3. **Inheritance-based test design**: The TPV test class inherits from the existing Pulsar test class, overriding only `job_config_file`. This means the TPV class also runs `test_user_defined_runs_in_correct_destination` from the parent.

4. **Null filtering in resource_requirements_from_list**: Rather than changing the `ResourceRequirement` constructor to accept `None`, the fix filters at the list-building level. This is cleaner because `ResourceRequirement` should always have a meaningful value.

## Data Flow

```
Tool YAML (cores_min: 2)
  -> parse_requirements() in yaml.py
  -> resource_requirements_from_list() in requirements.py
  -> [ResourceRequirement(value_or_expression=2, resource_type="cores_min")]
  -> Tool.resource_requirements attribute
  -> TPV reads resource_requirements at dispatch time
  -> TPV resolves {cores} template to 2.0
  -> GALAXY_SLOTS env var set to "2.0"
  -> Shell command: echo $GALAXY_SLOTS > galaxy_cores.txt
  -> Output: "2.0\n"
```

## Cross-Reference with Current Codebase

All files from the PR exist at the same paths in the current codebase (`cwl_tool_state` branch).

### Files with the PR changes present (merged and current):

| File | PR Change | Current State |
|------|-----------|---------------|
| `lib/galaxy/tool_util/deps/requirements.py` | `None` check added | Present at lines 306-308, identical |
| `test/integration/test_user_defined_tool_job_conf.py` | TPV test class added | Present and identical |
| `test/integration/embedded_pulsar_tpv_job_conf.yml` | New file | Present and identical |
| `lib/galaxy/dependencies/conditional-requirements.txt` | TPV `>=3.1.0,<4` | Now `>=3.1.2,<4` (further bumped) |
| `pyproject.toml` | TPV `>=3.1.0,<4` in test deps | Now `>=3.1.1,<4` referencing TPV PR #173 (further bumped) |
| `lib/galaxy/dependencies/pinned-test-requirements.txt` | TPV `==3.1.0` | Now `==3.1.3` |
| `lib/galaxy/dependencies/dev-requirements.txt` | TPV `==3.1.0` | Now `==3.1.3` |
| `lib/galaxy/dependencies/pinned-requirements.txt` | nodejs-wheel bump | Same versions (`22.20.0`) |

### Summary of Divergences

The only divergences are **version bumps** in TPV dependencies, which were subsequently updated by later PRs (e.g. #21014 "Bump up total-perspective-vortex dependency"). The core logic change in `requirements.py` and the test infrastructure are unchanged from what this PR introduced.

## Review Notes

- Reviewer: nsoranzo (approved)
- Minor review comment about commented-out test assertions, which mvdbeek addressed by uncommenting them (was a local docker issue during development).
