---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/tools
  - galaxy/tools/yaml
status: draft
created: 2026-02-24
revised: 2026-02-24
revision: 1
ai_generated: true
github_pr: 5378
github_repo: galaxyproject/galaxy
related_notes:
  - "[[PR 20936 - Resource Requirements via TPV]]"
---

# PR #5378 Research: "Allow specification of resource requirements in tools"

- **URL**: https://github.com/galaxyproject/galaxy/pull/5378
- **State**: MERGED
- **Author**: jmchilton (John Chilton), with significant follow-up by mvdbeek (Marius van den Beek) and review from nsoranzo (Nicola Soranzo)
- **Base**: `dev`
- **Head**: `resource_requirements`
- **Commits**: 14 (authored Oct 2020 - Jun 2022, committed Jun 2022)
- **Stats**: +212 / -36 lines across 12 files

## Purpose & Motivation

Allow Galaxy tool authors to declare **resource requirements** (CPU cores, RAM, tmpdir size) in tool XML/YAML definitions, modeled after CWL's `ResourceRequirement` spec (http://www.commonwl.org/v1.2/CommandLineTool.html#ResourceRequirement).

The backend doesn't fully support enforcing these at runtime (e.g., scheduling decisions), but the PR:
1. Defines the schema for declaring resources in tool XML/YAML
2. Parses them into `ResourceRequirement` objects available on the tool instance
3. Makes them available so dynamic job rules could dispatch based on them

Linked issue: https://github.com/galaxyproject/galaxy/issues/5369 (about `GALAXY_SLOTS` defaulting to 1 when not set).

## Key Design Decisions

1. **`<resource>` tag (not attributes)**: Early review iterations explored using XML attributes on a `<resource_requirement>` complex type (e.g., `cores_min="4"`). mvdbeek pushed back, noting that expressions in attributes are awkward. Final design uses `<resource type="cores_min">value</resource>` as child elements of `<requirements>`, allowing CDATA for expression values.

2. **CWL-to-Galaxy key mapping**: CWL uses camelCase (`coresMin`, `ramMax`), Galaxy uses snake_case (`cores_min`, `ram_max`). A mapping dict in `resource_requirements_from_list()` normalizes both formats.

3. **Expressions deferred**: The `ResourceRequirement` class detects whether a value is numeric or an expression string. Expressions raise `NotImplementedError` - a TODO for hooking up a JS evaluator. The linter warns about expression usage.

4. **Return tuple expansion**: `parse_requirements_and_containers()` changed from returning a 2-tuple `(requirements, containers)` to a 3-tuple `(requirements, containers, resource_requirements)`. Callers updated with `*_` unpacking for backward compat.

5. **`ResourceType` as `Literal` (not Enum)**: Per reviewer suggestion, uses `typing_extensions.Literal` with `get_args()` for validation instead of an Enum class.

## Files Changed (PR)

### 1. `lib/galaxy/tool_util/deps/requirements.py` (+98/-4) -- Core implementation

The main implementation file. Added:
- `ResourceType` Literal type with 6 values: `cores_min`, `cores_max`, `ram_min`, `ram_max`, `tmpdir_min`, `tmpdir_max`
- `ResourceRequirement` class with `value_or_expression`, `resource_type`, `runtime_required` fields and `get_value()` method
- `resource_requirements_from_list()` - converts CWL-style or Galaxy-style dicts into `ResourceRequirement` objects
- `resource_from_element()` - parses XML `<resource>` elements
- `parse_requirements_from_dict()` expanded to return 3-tuple
- `parse_requirements_from_xml()` gains `parse_resources` param

### 2. `lib/galaxy/tool_util/parser/interface.py` (+1/-1)

Docstring change: `parse_requirements_and_containers()` documented as returning triple instead of pair.

### 3. `lib/galaxy/tool_util/parser/xml.py` (+1/-1)

`parse_requirements_and_containers()` passes `parse_resources=True` to `parse_requirements_from_xml()`.

### 4. `lib/galaxy/tool_util/parser/cwl.py` (+2/-0)

Calls `self.tool_proxy.resource_requirements()` and passes them through to `parse_requirements_from_dict()`.

### 5. `lib/galaxy/tool_util/cwl/parser.py` (+3/-0)

New `resource_requirements()` method on the CWL tool proxy, filtering requirements by `class == "ResourceRequirement"`.

### 6. `lib/galaxy/tool_util/linters/general.py` (+4/-1)

Unpacks 3-tuple, adds lint warning for expression-based resource requirements.

### 7. `lib/galaxy/tool_util/linters/cwl.py` (+1/-1)

Updates unpacking from `_, containers` to `_, containers, *_`.

### 8. `lib/galaxy/tool_util/deps/mulled/mulled_build_tool.py` (+1/-1)

Updates unpacking from `requirements, _` to `requirements, *_`.

### 9. `lib/galaxy/tools/__init__.py` (+2/-1)

Unpacks 3-tuple in `Tool.parse()`, stores `self.resource_requirements` on tool instance.

### 10. `lib/galaxy/tool_util/xsd/galaxy.xsd` (+72/-24)

- Added `<resource>` element to `<requirements>` complex type
- Added `Resource` complex type with `type` attribute of `ResourceType`
- Added `ResourceType` simpleType with 6 enumeration values
- Trailing whitespace cleanup throughout

### 11. `test/functional/tools/resource_requirements.xml` (+19/-0) -- NEW

Example test tool with various resource requirements including expression values.

### 12. `test/unit/tool_util/test_parsing.py` (+8/-2)

Updated XML and YAML test fixtures with `<resource type="cores_min">1</resource>` / `cores_min: 1` entries. Updated test assertions for 3-tuple unpacking and `resource_type`/`runtime_required` checks.

## Cross-Reference with Current Codebase

All 12 files from the PR still exist at the same paths. However, the code has evolved significantly since merge.

### Significant Evolution

| Aspect | PR (2022) | Current State |
|--------|-----------|---------------|
| Method name | `parse_requirements_and_containers()` | `parse_requirements()` |
| Return tuple | 3-tuple: (reqs, containers, resource_reqs) | 5-tuple: (reqs, containers, resource_reqs, js_reqs, credentials) |
| `ResourceType` values | 6: cores_min/max, ram_min/max, tmpdir_min/max | 12: adds cuda_version_min, cuda_compute_capability, gpu_memory_min, cuda_device_count_min/max, shm_size |
| CWL mapping keys | 6 CWL keys | 12 CWL keys (adds cudaVersionMin, cudaComputeCapability, etc.) |
| `parse_requirements_from_dict` | Single combined function | Split: `parse_requirements_from_lists()` (explicit args) vs `parse_requirements_from_xml()` |
| XML parser kwarg | `parse_resources=True` | `parse_resources_and_credentials=True` |
| Test tool | 6 resource entries | 12 resource entries (GPU resources added) |
| Test assertions | Checks cores_min only | Checks all 7+ resource types including GPU |
| `ResourceRequirement` | No `to_dict()` | Has `to_dict()` method |
| Credentials support | Not present | `CredentialsRequirement` class added, parsed alongside resources |
| JavaScript requirements | Not present | `JavascriptRequirement` class added |

### File-by-File Current State

#### `lib/galaxy/tool_util/deps/requirements.py`
- **PR's changes fully integrated and expanded**. `ResourceRequirement` class retained identically. `ResourceType` extended with 6 GPU-related types. New `BaseCredential`, `SecretCredential`, `VariableCredential`, `CredentialsRequirement`, `JavascriptRequirement` classes added. `parse_requirements_from_lists()` replaces `parse_requirements_from_dict()` with explicit keyword args. `resource_requirements_from_list()` has added null-check: `if value is not None`.

#### `lib/galaxy/tool_util/parser/interface.py`
- Method renamed from `parse_requirements_and_containers()` to `parse_requirements()`. Returns 5-tuple. Has `@abstractmethod` decorator. Import alias: `ResourceRequirement as ToolResourceRequirement`.

#### `lib/galaxy/tool_util/parser/cwl.py`
- Uses `parse_requirements_from_lists()` with explicit keyword args. Also parses `credentials_requirements()` from tool proxy. Method is `parse_requirements()`.

#### `lib/galaxy/tool_util/cwl/parser.py`
- `resource_requirements()` method now uses `self.hints_or_requirements_of_class("ResourceRequirement")` instead of inline list comprehension. Also has `credentials_requirements()` method.

#### `lib/galaxy/tool_util/parser/xml.py`
- Calls `parse_requirements_from_xml(self.root, parse_resources_and_credentials=True)`. Method name is `parse_requirements()`.

#### `lib/galaxy/tool_util/parser/yaml.py` (not in PR, but relevant)
- Now also parses resource requirements, javascript requirements, and credentials via `parse_requirements_from_lists()` with filtering by `r.get("type")`.

#### `lib/galaxy/tool_util/linters/general.py`
- Resource requirement linting moved to its own `ResourceRequirementExpression` linter class (was inline in `lint_general` function). Uses class-based linting pattern.

#### `lib/galaxy/tools/__init__.py`
- Unpacks 5-tuple. Stores `self.resource_requirements`, `self.javascript_requirements`, `self.credentials`.

#### `lib/galaxy/tool_util/xsd/galaxy.xsd`
- `ResourceType` extended with 6 GPU enumerations: `cuda_version_min`, `cuda_compute_capability`, `gpu_memory_min`, `cuda_device_count_min`, `cuda_device_count_max`, `shm_size`.

#### `test/functional/tools/resource_requirements.xml`
- Extended from 6 to 12 resource entries (adds GPU resources).

#### `test/unit/tool_util/test_parsing.py`
- Tests expanded to cover all resource types. Uses `parse_requirements()` (renamed). Checks `to_dict()` serialization. Also tests credentials.

### Key Patterns Established by This PR

1. **Dual-format parsing**: The `resource_requirements_from_list()` function handles both CWL-format dicts (`class: ResourceRequirement`, camelCase keys) and Galaxy-format dicts (`type: resource`, snake_case keys) in a single function. This pattern persists.

2. **Expanding return tuples**: The approach of expanding the return tuple from parsers has continued (now 5 elements). Each new requirement type (JS, credentials) follows the same pattern.

3. **`*_` unpacking for backward compat**: Used in callers that don't need all tuple elements (e.g., `_, containers, *_ = tool_source.parse_requirements()`).

4. **Literal + get_args validation**: The `ResourceType = Literal[...]` / `VALID_RESOURCE_TYPES = get_args(ResourceType)` pattern for type-safe enumerations was established here and reused.

5. **Expression deferral**: The `runtime_required` flag and `NotImplementedError` for expressions is still present - expressions remain unimplemented.
